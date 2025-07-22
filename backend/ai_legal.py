import openai
from typing import List, Dict, Any
import json
from datetime import datetime
import pinecone
from langchain.embeddings import OpenAIEmbeddings
from langchain.vectorstores import Pinecone
from langchain.text_splitter import RecursiveCharacterTextSplitter
import os

class LegalAI:
    def __init__(self):
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        self.pinecone_api_key = os.getenv("PINECONE_API_KEY")
        self.pinecone_environment = os.getenv("PINECONE_ENVIRONMENT")
        
        openai.api_key = self.openai_api_key
        
        if self.pinecone_api_key:
            pinecone.init(
                api_key=self.pinecone_api_key,
                environment=self.pinecone_environment
            )
        
        self.embeddings = OpenAIEmbeddings()
        self.legal_knowledge_base = self._load_legal_knowledge()
    
    def _load_legal_knowledge(self) -> Dict[str, str]:
        return {
            "lei_14133": "Lei 14.133/2021 - Nova Lei de Licitações e Contratos",
            "lei_8666": "Lei 8.666/1993 - Lei de Licitações (revogada parcialmente)",
            "tcu_jurisprudencia": "Jurisprudência do TCU sobre licitações públicas",
            "cgu_orientacoes": "Orientações da CGU sobre transparência e licitações"
        }
    
    async def analyze_document(self, document_text: str) -> Dict[str, Any]:
        prompt = f"""
        Analise o seguinte edital de licitação e forneça:
        
        1. Resumo executivo jurídico
        2. Requisitos obrigatórios identificados
        3. Pontos de atenção jurídica
        4. Documentos necessários
        5. Indicador de conformidade (0-100%)
        6. Riscos jurídicos identificados
        7. Recomendações específicas
        
        Documento:
        {document_text[:4000]}
        
        Responda em formato JSON estruturado com fundamentação legal específica.
        """
        
        try:
            response = await openai.ChatCompletion.acreate(
                model="gpt-4-turbo-preview",
                messages=[
                    {"role": "system", "content": "Você é um especialista em direito administrativo e licitações públicas brasileiras. Base suas respostas na Lei 14.133/21, jurisprudência do TCU, STJ e STF."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=2000
            )
            
            result = json.loads(response.choices[0].message.content)
            return result
            
        except Exception as e:
            return {"error": f"Erro na análise: {str(e)}"}
    
    async def legal_consultation(self, question: str, context: str = None) -> Dict[str, Any]:
        context_text = f"\nContexto do edital: {context}" if context else ""
        
        prompt = f"""
        Pergunta jurídica: {question}{context_text}
        
        Forneça uma resposta fundamentada em:
        1. Lei 14.133/2021 (citação específica do artigo)
        2. Jurisprudência relevante (TCU, STJ, STF)
        3. Orientações de órgãos de controle
        
        Estruture a resposta com:
        - Resposta direta
        - Fundamentação legal (artigos específicos)
        - Jurisprudência aplicável
        - Recomendações práticas
        - Score de confiança (0-100%)
        """
        
        try:
            response = await openai.ChatCompletion.acreate(
                model="gpt-4-turbo-preview",
                messages=[
                    {"role": "system", "content": "Você é um consultor jurídico especialista em licitações públicas brasileiras. Sempre cite a legislação específica e jurisprudência relevante."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.2,
                max_tokens=1500
            )
            
            return {
                "response": response.choices[0].message.content,
                "timestamp": datetime.utcnow().isoformat(),
                "model_used": "gpt-4-turbo-preview"
            }
            
        except Exception as e:
            return {"error": f"Erro na consulta: {str(e)}"}
    
    async def generate_legal_document(self, document_type: str, context: str) -> Dict[str, Any]:
        document_templates = {
            "pedido_esclarecimento": """
            Template para pedido de esclarecimento baseado no art. 23 da Lei 14.133/21
            """,
            "impugnacao": """
            Template para impugnação baseado no art. 24 da Lei 14.133/21
            """,
            "recurso_administrativo": """
            Template para recurso administrativo baseado no art. 165 da Lei 14.133/21
            """,
            "contrarrazoes": """
            Template para contrarrazões em recursos administrativos
            """
        }
        
        template = document_templates.get(document_type, "Documento jurídico genérico")
        
        prompt = f"""
        Gere um {document_type} com base no seguinte contexto:
        {context}
        
        O documento deve:
        1. Seguir as formalidades legais brasileiras
        2. Citar a legislação aplicável
        3. Ter linguagem jurídica adequada
        4. Incluir fundamentação legal específica
        5. Seguir o template: {template}
        
        Formate como documento formal com:
        - Cabeçalho apropriado
        - Fundamentação legal
        - Pedido/requerimento específico
        - Fecho formal
        """
        
        try:
            response = await openai.ChatCompletion.acreate(
                model="gpt-4-turbo-preview",
                messages=[
                    {"role": "system", "content": "Você é um advogado especialista em direito administrativo brasileiro, especializado em licitações públicas."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.2,
                max_tokens=2000
            )
            
            return {
                "document": response.choices[0].message.content,
                "document_type": document_type,
                "generated_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {"error": f"Erro na geração do documento: {str(e)}"}
    
    async def compare_with_jurisprudence(self, edital_text: str) -> Dict[str, Any]:
        prompt = f"""
        Compare este edital com jurisprudência do TCU, STJ e STF.
        
        Identifique:
        1. Cláusulas que podem ser questionadas judicialmente
        2. Precedentes favoráveis ou contrários
        3. Teses jurídicas aplicáveis
        4. Recomendações estratégicas
        
        Edital: {edital_text[:3000]}
        """
        
        try:
            response = await openai.ChatCompletion.acreate(
                model="gpt-4-turbo-preview",
                messages=[
                    {"role": "system", "content": "Você é um jurista especialista em licitações com amplo conhecimento de jurisprudência dos tribunais superiores."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=1800
            )
            
            return {
                "jurisprudence_analysis": response.choices[0].message.content,
                "analyzed_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {"error": f"Erro na análise jurisprudencial: {str(e)}"}