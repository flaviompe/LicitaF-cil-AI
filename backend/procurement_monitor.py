import asyncio
import aiohttp
from bs4 import BeautifulSoup
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import re
from sqlalchemy.orm import Session
from models import Procurement, ProcurementMonitor
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ProcurementMonitorService:
    def __init__(self):
        self.portals = [
            {
                "name": "ComprasNet",
                "base_url": "https://www.comprasnet.gov.br",
                "search_endpoint": "/ConsultaLicitacoes/ConsLicitacao_Relacao.asp"
            },
            {
                "name": "Banco do Brasil",
                "base_url": "https://www.licitacoes-e.com.br",
                "search_endpoint": "/aop/licitacoes-publicas/sp/sao-paulo"
            },
            {
                "name": "TCE-SP",
                "base_url": "https://www.tce.sp.gov.br",
                "search_endpoint": "/audesp/licitacoes"
            }
        ]
    
    async def create_monitor(self, monitor_data, db: Session):
        new_monitor = ProcurementMonitor(**monitor_data.dict())
        db.add(new_monitor)
        db.commit()
        db.refresh(new_monitor)
        
        await self.start_monitoring_task(new_monitor.id)
        return new_monitor
    
    async def get_all_monitors(self, db: Session):
        return db.query(ProcurementMonitor).filter(ProcurementMonitor.is_active == True).all()
    
    async def get_opportunities(self, region: str = None, category: str = None, 
                              value_min: float = None, value_max: float = None, db: Session = None):
        
        query = db.query(Procurement).filter(Procurement.status == "open")
        
        if region:
            query = query.filter(Procurement.region.ilike(f"%{region}%"))
        if category:
            query = query.filter(Procurement.category.ilike(f"%{category}%"))
        if value_min:
            query = query.filter(Procurement.estimated_value >= value_min)
        if value_max:
            query = query.filter(Procurement.estimated_value <= value_max)
        
        opportunities = query.order_by(Procurement.opening_date.desc()).limit(50).all()
        
        enriched_opportunities = []
        for opp in opportunities:
            enriched_opp = {
                **opp.__dict__,
                "competition_level": await self._analyze_competition(opp.external_id),
                "success_probability": await self._calculate_success_probability(opp),
                "strategic_recommendation": await self._get_strategic_recommendation(opp)
            }
            enriched_opportunities.append(enriched_opp)
        
        return enriched_opportunities
    
    async def start_monitoring_task(self, monitor_id: int):
        asyncio.create_task(self._monitor_procurements_continuously(monitor_id))
    
    async def _monitor_procurements_continuously(self, monitor_id: int):
        while True:
            try:
                await self._scan_all_portals(monitor_id)
                await asyncio.sleep(3600)  # Escanear a cada hora
            except Exception as e:
                logger.error(f"Erro no monitoramento {monitor_id}: {e}")
                await asyncio.sleep(1800)  # Retry após 30 min em caso de erro
    
    async def _scan_all_portals(self, monitor_id: int):
        tasks = []
        for portal in self.portals:
            task = self._scan_portal(portal, monitor_id)
            tasks.append(task)
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        all_procurements = []
        for result in results:
            if isinstance(result, Exception):
                logger.error(f"Erro ao escanear portal: {result}")
            else:
                all_procurements.extend(result)
        
        return all_procurements
    
    async def _scan_portal(self, portal: Dict, monitor_id: int) -> List[Dict]:
        try:
            async with aiohttp.ClientSession() as session:
                search_url = f"{portal['base_url']}{portal['search_endpoint']}"
                
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
                
                async with session.get(search_url, headers=headers, timeout=30) as response:
                    if response.status == 200:
                        html = await response.text()
                        return await self._parse_procurement_data(html, portal['name'])
                    else:
                        logger.warning(f"Portal {portal['name']} retornou status {response.status}")
                        return []
        
        except Exception as e:
            logger.error(f"Erro ao acessar {portal['name']}: {e}")
            return []
    
    async def _parse_procurement_data(self, html: str, portal_name: str) -> List[Dict]:
        soup = BeautifulSoup(html, 'html.parser')
        procurements = []
        
        if portal_name == "ComprasNet":
            procurements = self._parse_comprasnet(soup)
        elif portal_name == "Banco do Brasil":
            procurements = self._parse_bb_licitacoes(soup)
        elif portal_name == "TCE-SP":
            procurements = self._parse_tce_sp(soup)
        
        return procurements
    
    def _parse_comprasnet(self, soup: BeautifulSoup) -> List[Dict]:
        procurements = []
        
        try:
            rows = soup.find_all('tr', class_=['tex3', 'tex3b'])
            
            for row in rows:
                cols = row.find_all('td')
                if len(cols) >= 6:
                    procurement = {
                        'title': cols[2].get_text(strip=True),
                        'organ': cols[1].get_text(strip=True),
                        'modality': cols[0].get_text(strip=True),
                        'external_id': cols[3].get_text(strip=True),
                        'opening_date': self._parse_date(cols[4].get_text(strip=True)),
                        'estimated_value': self._parse_value(cols[5].get_text(strip=True)),
                        'source_url': 'ComprasNet',
                        'status': 'open'
                    }
                    procurements.append(procurement)
        
        except Exception as e:
            logger.error(f"Erro ao processar ComprasNet: {e}")
        
        return procurements
    
    def _parse_bb_licitacoes(self, soup: BeautifulSoup) -> List[Dict]:
        procurements = []
        
        try:
            cards = soup.find_all('div', class_='licitacao-card')
            
            for card in cards:
                title_elem = card.find('h3')
                organ_elem = card.find('span', class_='orgao')
                value_elem = card.find('span', class_='valor')
                date_elem = card.find('span', class_='data')
                
                if title_elem:
                    procurement = {
                        'title': title_elem.get_text(strip=True),
                        'organ': organ_elem.get_text(strip=True) if organ_elem else '',
                        'modality': 'Pregão',  # Assumir pregão como padrão
                        'estimated_value': self._parse_value(value_elem.get_text(strip=True)) if value_elem else None,
                        'opening_date': self._parse_date(date_elem.get_text(strip=True)) if date_elem else None,
                        'source_url': 'Banco do Brasil',
                        'status': 'open'
                    }
                    procurements.append(procurement)
        
        except Exception as e:
            logger.error(f"Erro ao processar Banco do Brasil: {e}")
        
        return procurements
    
    def _parse_tce_sp(self, soup: BeautifulSoup) -> List[Dict]:
        procurements = []
        
        try:
            items = soup.find_all('div', class_='audesp-item')
            
            for item in items:
                title = item.find('a', class_='titulo')
                details = item.find('div', class_='detalhes')
                
                if title and details:
                    procurement = {
                        'title': title.get_text(strip=True),
                        'description': details.get_text(strip=True)[:500],
                        'organ': 'TCE-SP',
                        'modality': 'Licitação',
                        'source_url': 'TCE-SP',
                        'status': 'open'
                    }
                    procurements.append(procurement)
        
        except Exception as e:
            logger.error(f"Erro ao processar TCE-SP: {e}")
        
        return procurements
    
    def _parse_date(self, date_str: str) -> Optional[datetime]:
        try:
            date_patterns = [
                r'(\d{2})/(\d{2})/(\d{4})',
                r'(\d{4})-(\d{2})-(\d{2})',
                r'(\d{2})-(\d{2})-(\d{4})'
            ]
            
            for pattern in date_patterns:
                match = re.search(pattern, date_str)
                if match:
                    if '/' in date_str:
                        day, month, year = match.groups()
                    else:
                        year, month, day = match.groups()
                    
                    return datetime(int(year), int(month), int(day))
            
            return None
        
        except:
            return None
    
    def _parse_value(self, value_str: str) -> Optional[float]:
        try:
            value_clean = re.sub(r'[^\d,.]', '', value_str)
            value_clean = value_clean.replace(',', '.')
            
            if value_clean:
                return float(value_clean)
            return None
        
        except:
            return None
    
    async def _analyze_competition(self, external_id: str) -> Dict[str, Any]:
        return {
            "estimated_participants": 5,  # Placeholder - implementar análise real
            "competition_level": "medium",
            "historical_winners": []
        }
    
    async def _calculate_success_probability(self, procurement) -> float:
        factors = {
            "value_match": 0.2,  # Se valor está na faixa da empresa
            "category_match": 0.3,  # Se categoria é forte para empresa
            "region_proximity": 0.2,  # Proximidade geográfica
            "competition_level": 0.3   # Nível de competição
        }
        
        return 0.75  # Placeholder - implementar cálculo real
    
    async def _get_strategic_recommendation(self, procurement) -> str:
        recommendations = [
            "Oportunidade com alta probabilidade de sucesso",
            "Considerar participação - baixa competição",
            "Analisar requisitos técnicos detalhadamente",
            "Verificar documentação obrigatória"
        ]
        
        return recommendations[0]  # Placeholder - implementar lógica real