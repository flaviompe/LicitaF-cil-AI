import smtplib
import asyncio
import aiohttp
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any
import os
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class NotificationService:
    def __init__(self):
        self.email_config = {
            'smtp_server': os.getenv('SMTP_SERVER', 'smtp.gmail.com'),
            'smtp_port': int(os.getenv('SMTP_PORT', '587')),
            'username': os.getenv('EMAIL_USERNAME'),
            'password': os.getenv('EMAIL_PASSWORD')
        }
        
        self.telegram_config = {
            'bot_token': os.getenv('TELEGRAM_BOT_TOKEN'),
            'api_url': 'https://api.telegram.org/bot{}/sendMessage'
        }
    
    async def send_notification(self, message: str, channel: str, recipient: str) -> Dict[str, Any]:
        try:
            if channel.lower() == 'email':
                return await self._send_email(message, recipient)
            elif channel.lower() == 'telegram':
                return await self._send_telegram(message, recipient)
            elif channel.lower() == 'sms':
                return await self._send_sms(message, recipient)
            else:
                return {'success': False, 'error': f'Canal {channel} não suportado'}
        
        except Exception as e:
            logger.error(f"Erro ao enviar notificação {channel}: {e}")
            return {'success': False, 'error': str(e)}
    
    async def _send_email(self, message: str, recipient: str) -> Dict[str, Any]:
        try:
            msg = MIMEMultipart()
            msg['From'] = self.email_config['username']
            msg['To'] = recipient
            msg['Subject'] = "Nova Oportunidade de Licitação - Plataforma IA"
            
            html_message = f"""
            <html>
            <body>
                <h2>🏢 Nova Oportunidade de Licitação</h2>
                <div style="background-color: #f0f8ff; padding: 20px; border-radius: 5px;">
                    <p>{message}</p>
                </div>
                <hr>
                <p><small>Enviado pela Plataforma de Licitações com IA Jurídica</small></p>
                <p><small>Data/Hora: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}</small></p>
            </body>
            </html>
            """
            
            msg.attach(MIMEText(html_message, 'html'))
            
            def send_email_sync():
                with smtplib.SMTP(self.email_config['smtp_server'], self.email_config['smtp_port']) as server:
                    server.starttls()
                    server.login(self.email_config['username'], self.email_config['password'])
                    server.send_message(msg)
            
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, send_email_sync)
            
            return {'success': True, 'channel': 'email', 'recipient': recipient}
        
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    async def _send_telegram(self, message: str, chat_id: str) -> Dict[str, Any]:
        try:
            if not self.telegram_config['bot_token']:
                return {'success': False, 'error': 'Token do Telegram não configurado'}
            
            url = self.telegram_config['api_url'].format(self.telegram_config['bot_token'])
            
            formatted_message = f"""
🏢 *Nova Oportunidade de Licitação*

{message}

⏰ {datetime.now().strftime('%d/%m/%Y às %H:%M')}
🤖 _Plataforma de Licitações com IA Jurídica_
            """
            
            payload = {
                'chat_id': chat_id,
                'text': formatted_message,
                'parse_mode': 'Markdown'
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=payload) as response:
                    if response.status == 200:
                        return {'success': True, 'channel': 'telegram', 'recipient': chat_id}
                    else:
                        error_data = await response.json()
                        return {'success': False, 'error': error_data.get('description', 'Erro desconhecido')}
        
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    async def _send_sms(self, message: str, phone_number: str) -> Dict[str, Any]:
        try:
            sms_message = f"LICITACAO: {message[:100]}... Acesse a plataforma para detalhes."
            
            logger.info(f"SMS simulado para {phone_number}: {sms_message}")
            
            return {'success': True, 'channel': 'sms', 'recipient': phone_number}
        
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    async def send_bulk_notifications(self, notifications: list) -> Dict[str, Any]:
        tasks = []
        
        for notification in notifications:
            task = self.send_notification(
                notification['message'],
                notification['channel'],
                notification['recipient']
            )
            tasks.append(task)
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        successful = sum(1 for r in results if isinstance(r, dict) and r.get('success'))
        failed = len(results) - successful
        
        return {
            'total': len(notifications),
            'successful': successful,
            'failed': failed,
            'results': results
        }
    
    async def create_procurement_alert(self, procurement_data: Dict, user_preferences: Dict) -> str:
        alert_message = f"""
🎯 NOVA OPORTUNIDADE DETECTADA

📋 Título: {procurement_data.get('title', 'N/A')}
🏛️ Órgão: {procurement_data.get('organ', 'N/A')}
📝 Modalidade: {procurement_data.get('modality', 'N/A')}
💰 Valor Estimado: R$ {procurement_data.get('estimated_value', 'N/A'):,.2f} if procurement_data.get('estimated_value') else 'Não informado'
📅 Abertura: {procurement_data.get('opening_date', 'N/A')}
📍 Região: {procurement_data.get('region', 'N/A')}

🔍 ANÁLISE INTELIGENTE:
• Probabilidade de Sucesso: {procurement_data.get('success_probability', 0.5) * 100:.1f}%
• Nível de Competição: {procurement_data.get('competition_level', 'Médio')}
• Recomendação: {procurement_data.get('strategic_recommendation', 'Analisar detalhadamente')}

⚖️ VERIFICAÇÃO JURÍDICA NECESSÁRIA
✅ Conferir documentação obrigatória
✅ Validar requisitos de habilitação
✅ Verificar prazos e cronograma

🔗 Link: {procurement_data.get('source_url', 'N/A')}
        """
        
        return alert_message.strip()
    
    async def create_legal_alert(self, legal_analysis: Dict) -> str:
        alert_message = f"""
⚖️ ALERTA JURÍDICO - ANÁLISE COMPLETA

📊 Score de Conformidade: {legal_analysis.get('compliance_score', 0)}%

🚨 RISCOS IDENTIFICADOS:
{chr(10).join([f'• {risk}' for risk in legal_analysis.get('legal_risks', [])])}

📋 DOCUMENTOS FALTANTES:
{chr(10).join([f'• {doc}' for doc in legal_analysis.get('missing_documents', [])])}

💡 RECOMENDAÇÕES:
{chr(10).join([f'• {rec}' for rec in legal_analysis.get('recommendations', [])])}

🔍 Analisado em: {datetime.now().strftime('%d/%m/%Y às %H:%M')}
        """
        
        return alert_message.strip()