import asyncio
from typing import Dict, Any, List
from datetime import datetime
import json
from jinja2 import Template
import os

class DocumentGenerator:
    def __init__(self):
        self.templates_path = os.path.join(os.path.dirname(__file__), 'templates')
        self.document_types = {
            'proposta_tecnica': 'Proposta Técnica',
            'proposta_comercial': 'Proposta Comercial', 
            'planilha_precos': 'Planilha de Preços',
            'declaracao_cumprimento_requisitos': 'Declaração de Cumprimento de Requisitos',
            'declaracao_inexistencia_fato_impeditivo': 'Declaração de Inexistência de Fato Impeditivo',
            'declaracao_menor_aprendiz': 'Declaração de Cumprimento ao Menor Aprendiz',
            'procuracao': 'Procuração',
            'pedido_esclarecimento': 'Pedido de Esclarecimento',
            'impugnacao': 'Impugnação de Edital',
            'recurso_administrativo': 'Recurso Administrativo',
            'contrarrazoes': 'Contrarrazões'
        }
        
        self._create_default_templates()
    
    def _create_default_templates(self):
        if not os.path.exists(self.templates_path):
            os.makedirs(self.templates_path)
        
        templates = {
            'proposta_tecnica': self._get_proposta_tecnica_template(),
            'proposta_comercial': self._get_proposta_comercial_template(),
            'planilha_precos': self._get_planilha_precos_template(),
            'declaracao_cumprimento_requisitos': self._get_declaracao_cumprimento_template(),
            'declaracao_inexistencia_fato_impeditivo': self._get_declaracao_inexistencia_template(),
            'declaracao_menor_aprendiz': self._get_declaracao_menor_aprendiz_template(),
            'procuracao': self._get_procuracao_template(),
            'pedido_esclarecimento': self._get_pedido_esclarecimento_template(),
            'impugnacao': self._get_impugnacao_template(),
            'recurso_administrativo': self._get_recurso_administrativo_template(),
            'contrarrazoes': self._get_contrarrazoes_template()
        }
        
        for doc_type, template_content in templates.items():
            template_path = os.path.join(self.templates_path, f'{doc_type}.html')
            if not os.path.exists(template_path):
                with open(template_path, 'w', encoding='utf-8') as f:
                    f.write(template_content)
    
    async def generate_document(self, document_type: str, context: Dict[str, Any]) -> Dict[str, Any]:
        if document_type not in self.document_types:
            return {'error': f'Tipo de documento não suportado: {document_type}'}
        
        try:
            template_path = os.path.join(self.templates_path, f'{document_type}.html')
            
            with open(template_path, 'r', encoding='utf-8') as f:
                template_content = f.read()
            
            template = Template(template_content)
            
            context_with_defaults = {
                'data_geracao': datetime.now().strftime('%d/%m/%Y'),
                'hora_geracao': datetime.now().strftime('%H:%M:%S'),
                **context
            }
            
            generated_content = template.render(**context_with_defaults)
            
            return {
                'success': True,
                'document_type': self.document_types[document_type],
                'content': generated_content,
                'generated_at': datetime.now().isoformat(),
                'context_used': context_with_defaults
            }
            
        except Exception as e:
            return {'error': f'Erro ao gerar documento: {str(e)}'}
    
    def _get_proposta_tecnica_template(self) -> str:
        return """
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Proposta Técnica - {{ empresa_nome }}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
        .header { text-align: center; margin-bottom: 30px; }
        .section { margin: 20px 0; }
        .bold { font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>PROPOSTA TÉCNICA</h1>
        <h2>{{ edital_titulo | default('EDITAL Nº [NÚMERO]') }}</h2>
        <p>{{ orgao_nome | default('[NOME DO ÓRGÃO]') }}</p>
    </div>

    <div class="section">
        <h3>1. IDENTIFICAÇÃO DA EMPRESA</h3>
        <p><span class="bold">Razão Social:</span> {{ empresa_nome | default('[RAZÃO SOCIAL]') }}</p>
        <p><span class="bold">CNPJ:</span> {{ empresa_cnpj | default('[CNPJ]') }}</p>
        <p><span class="bold">Endereço:</span> {{ empresa_endereco | default('[ENDEREÇO COMPLETO]') }}</p>
        <p><span class="bold">Telefone:</span> {{ empresa_telefone | default('[TELEFONE]') }}</p>
        <p><span class="bold">E-mail:</span> {{ empresa_email | default('[EMAIL]') }}</p>
    </div>

    <div class="section">
        <h3>2. OBJETO</h3>
        <p>{{ objeto_descricao | default('[DESCRIÇÃO DO OBJETO CONFORME EDITAL]') }}</p>
    </div>

    <div class="section">
        <h3>3. METODOLOGIA</h3>
        <p>{{ metodologia | default('Nossa empresa utilizará metodologia comprovada baseada nas melhores práticas do mercado, garantindo qualidade e eficiência na execução dos serviços.') }}</p>
    </div>

    <div class="section">
        <h3>4. CRONOGRAMA DE EXECUÇÃO</h3>
        <table>
            <tr>
                <th>Fase</th>
                <th>Descrição</th>
                <th>Prazo (dias)</th>
            </tr>
            {% for fase in cronograma | default([]) %}
            <tr>
                <td>{{ fase.numero }}</td>
                <td>{{ fase.descricao }}</td>
                <td>{{ fase.prazo }}</td>
            </tr>
            {% endfor %}
        </table>
    </div>

    <div class="section">
        <h3>5. QUALIFICAÇÃO TÉCNICA</h3>
        <p><span class="bold">Experiência:</span> {{ experiencia_descricao | default('Nossa empresa possui sólida experiência no segmento, com histórico comprovado de execução de projetos similares.') }}</p>
        
        <h4>5.1. Principais Clientes/Contratos Executados:</h4>
        <ul>
            {% for contrato in contratos_anteriores | default([]) %}
            <li>{{ contrato.cliente }} - {{ contrato.objeto }} ({{ contrato.periodo }})</li>
            {% endfor %}
        </ul>
    </div>

    <div class="section">
        <h3>6. EQUIPE TÉCNICA</h3>
        <table>
            <tr>
                <th>Nome</th>
                <th>Função</th>
                <th>Formação</th>
                <th>Experiência</th>
            </tr>
            {% for membro in equipe_tecnica | default([]) %}
            <tr>
                <td>{{ membro.nome }}</td>
                <td>{{ membro.funcao }}</td>
                <td>{{ membro.formacao }}</td>
                <td>{{ membro.experiencia }}</td>
            </tr>
            {% endfor %}
        </table>
    </div>

    <div class="section">
        <h3>7. DECLARAÇÃO FINAL</h3>
        <p>Declaramos que nossa empresa tem plenas condições de executar os serviços objeto desta licitação, 
        nos termos e condições estabelecidos no edital e seus anexos.</p>
    </div>

    <div class="section" style="margin-top: 50px;">
        <p style="text-align: center;">
            {{ empresa_cidade | default('[CIDADE]') }}, {{ data_geracao }}<br><br>
            _________________________________<br>
            {{ representante_nome | default('[NOME DO REPRESENTANTE]') }}<br>
            {{ representante_cargo | default('[CARGO]') }}<br>
            {{ empresa_nome | default('[RAZÃO SOCIAL]') }}
        </p>
    </div>
</body>
</html>
        """
    
    def _get_proposta_comercial_template(self) -> str:
        return """
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Proposta Comercial - {{ empresa_nome }}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
        .header { text-align: center; margin-bottom: 30px; }
        .section { margin: 20px 0; }
        .bold { font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
        th { background-color: #f2f2f2; }
        .valor { text-align: right; font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">
        <h1>PROPOSTA COMERCIAL</h1>
        <h2>{{ edital_titulo | default('EDITAL Nº [NÚMERO]') }}</h2>
        <p>{{ orgao_nome | default('[NOME DO ÓRGÃO]') }}</p>
    </div>

    <div class="section">
        <h3>1. IDENTIFICAÇÃO DA PROPONENTE</h3>
        <p><span class="bold">Razão Social:</span> {{ empresa_nome | default('[RAZÃO SOCIAL]') }}</p>
        <p><span class="bold">CNPJ:</span> {{ empresa_cnpj | default('[CNPJ]') }}</p>
        <p><span class="bold">Endereço:</span> {{ empresa_endereco | default('[ENDEREÇO]') }}</p>
    </div>

    <div class="section">
        <h3>2. PROPOSTA DE PREÇOS</h3>
        <table>
            <tr>
                <th>Item</th>
                <th>Descrição</th>
                <th>Unidade</th>
                <th>Quantidade</th>
                <th>Valor Unitário (R$)</th>
                <th>Valor Total (R$)</th>
            </tr>
            {% for item in itens_proposta | default([]) %}
            <tr>
                <td>{{ item.numero }}</td>
                <td>{{ item.descricao }}</td>
                <td>{{ item.unidade }}</td>
                <td class="valor">{{ item.quantidade }}</td>
                <td class="valor">{{ "%.2f"|format(item.valor_unitario) }}</td>
                <td class="valor">{{ "%.2f"|format(item.valor_total) }}</td>
            </tr>
            {% endfor %}
            <tr style="background-color: #f9f9f9; font-weight: bold;">
                <td colspan="5">VALOR TOTAL GERAL</td>
                <td class="valor">R$ {{ "%.2f"|format(valor_total_geral | default(0)) }}</td>
            </tr>
        </table>
    </div>

    <div class="section">
        <h3>3. CONDIÇÕES COMERCIAIS</h3>
        <p><span class="bold">Prazo de Validade da Proposta:</span> {{ prazo_validade | default('60 (sessenta) dias') }}</p>
        <p><span class="bold">Prazo de Execução:</span> {{ prazo_execucao | default('[CONFORME EDITAL]') }}</p>
        <p><span class="bold">Forma de Pagamento:</span> {{ forma_pagamento | default('Conforme especificado no edital') }}</p>
        <p><span class="bold">Local de Execução:</span> {{ local_execucao | default('[CONFORME EDITAL]') }}</p>
    </div>

    <div class="section">
        <h3>4. DECLARAÇÕES</h3>
        <p>Declaramos que:</p>
        <ul>
            <li>Os preços propostos incluem todos os custos e despesas necessárias à execução do objeto;</li>
            <li>Temos condições de executar os serviços nos prazos estabelecidos;</li>
            <li>Concordamos com todas as condições estabelecidas no edital;</li>
            <li>Esta proposta é firme e precisa, não havendo qualquer erro ou omissão.</li>
        </ul>
    </div>

    <div class="section" style="margin-top: 50px;">
        <p style="text-align: center;">
            {{ empresa_cidade | default('[CIDADE]') }}, {{ data_geracao }}<br><br>
            _________________________________<br>
            {{ representante_nome | default('[NOME DO REPRESENTANTE]') }}<br>
            {{ representante_cargo | default('[CARGO]') }}<br>
            {{ empresa_nome | default('[RAZÃO SOCIAL]') }}
        </p>
    </div>
</body>
</html>
        """
    
    def _get_planilha_precos_template(self) -> str:
        return """
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Planilha de Preços - {{ empresa_nome }}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.4; margin: 20px; font-size: 12px; }
        .header { text-align: center; margin-bottom: 30px; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { border: 1px solid #333; padding: 6px; text-align: center; }
        th { background-color: #e0e0e0; font-weight: bold; }
        .text-left { text-align: left; }
        .text-right { text-align: right; }
        .valor { font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">
        <h2>PLANILHA DE PREÇOS</h2>
        <p><strong>{{ edital_titulo | default('EDITAL Nº [NÚMERO]') }}</strong></p>
        <p>{{ orgao_nome | default('[ÓRGÃO LICITANTE]') }}</p>
    </div>

    <table>
        <tr>
            <th rowspan="2">ITEM</th>
            <th rowspan="2">DESCRIÇÃO DOS SERVIÇOS</th>
            <th rowspan="2">UNID.</th>
            <th rowspan="2">QUANT.</th>
            <th colspan="3">COMPOSIÇÃO DE PREÇOS (R$)</th>
            <th rowspan="2">VALOR TOTAL (R$)</th>
        </tr>
        <tr>
            <th>Custo Direto</th>
            <th>BDI (%)</th>
            <th>Valor Unitário</th>
        </tr>
        
        {% for item in itens_planilha | default([]) %}
        <tr>
            <td>{{ item.numero }}</td>
            <td class="text-left">{{ item.descricao }}</td>
            <td>{{ item.unidade }}</td>
            <td>{{ item.quantidade }}</td>
            <td class="text-right">{{ "%.2f"|format(item.custo_direto) }}</td>
            <td class="text-right">{{ "%.1f"|format(item.bdi) }}%</td>
            <td class="text-right valor">{{ "%.2f"|format(item.valor_unitario) }}</td>
            <td class="text-right valor">{{ "%.2f"|format(item.valor_total) }}</td>
        </tr>
        {% endfor %}
        
        <tr style="background-color: #f0f0f0; font-weight: bold;">
            <td colspan="7">TOTAL GERAL</td>
            <td class="text-right valor">R$ {{ "%.2f"|format(total_geral | default(0)) }}</td>
        </tr>
    </table>

    <div style="margin-top: 30px;">
        <h4>OBSERVAÇÕES:</h4>
        <ul style="font-size: 11px;">
            <li>Os preços incluem todos os custos diretos e indiretos necessários à execução dos serviços;</li>
            <li>BDI (Benefícios e Despesas Indiretas): {{ bdi_percentual | default('15,00') }}%;</li>
            <li>Os valores estão expressos em moeda nacional (Real - R$);</li>
            <li>Validade da proposta: {{ validade_proposta | default('60 dias') }}.</li>
        </ul>
    </div>

    <div style="margin-top: 40px; text-align: center;">
        {{ empresa_cidade | default('[CIDADE]') }}, {{ data_geracao }}<br><br>
        _________________________________<br>
        {{ representante_nome | default('[REPRESENTANTE LEGAL]') }}<br>
        {{ empresa_nome | default('[RAZÃO SOCIAL]') }}<br>
        CNPJ: {{ empresa_cnpj | default('[CNPJ]') }}
    </div>
</body>
</html>
        """
    
    def _get_declaracao_cumprimento_template(self) -> str:
        return """
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Declaração de Cumprimento de Requisitos</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.8; margin: 40px; }
        .header { text-align: center; margin-bottom: 40px; }
        .content { text-align: justify; }
        .bold { font-weight: bold; }
        .signature { margin-top: 80px; text-align: center; }
    </style>
</head>
<body>
    <div class="header">
        <h2>DECLARAÇÃO DE CUMPRIMENTO DOS REQUISITOS DE HABILITAÇÃO</h2>
    </div>

    <div class="content">
        <p>Eu, <span class="bold">{{ representante_nome | default('[NOME DO REPRESENTANTE LEGAL]') }}</span>, 
        portador do CPF nº {{ representante_cpf | default('[CPF]') }}, na qualidade de 
        {{ representante_cargo | default('representante legal') }} da empresa 
        <span class="bold">{{ empresa_nome | default('[RAZÃO SOCIAL]') }}</span>, 
        inscrita no CNPJ sob o nº {{ empresa_cnpj | default('[CNPJ]') }}, 
        com sede na {{ empresa_endereco | default('[ENDEREÇO COMPLETO]') }}, 
        DECLARO, sob as penas da lei, para fins de participação na licitação referente ao 
        <span class="bold">{{ edital_titulo | default('EDITAL Nº [NÚMERO/ANO]') }}</span>, 
        do(a) {{ orgao_nome | default('[ÓRGÃO LICITANTE]') }}, que:</p>

        <p><span class="bold">1.</span> A empresa cumpre plenamente os requisitos de habilitação 
        exigidos no edital da licitação;</p>

        <p><span class="bold">2.</span> Possui habilitação jurídica, qualificação técnica, 
        qualificação econômico-financeira e regularidade fiscal e trabalhista necessárias 
        para execução do objeto licitado;</p>

        <p><span class="bold">3.</span> Tem ciência de que a falta de atendimento a qualquer 
        exigência para habilitação constante do edital ensejará aplicação das penalidades 
        cabíveis;</p>

        <p><span class="bold">4.</span> Compromete-se a manter, durante toda a execução do 
        contrato, em compatibilidade com as obrigações assumidas, todas as condições de 
        habilitação e qualificação exigidas na licitação;</p>

        <p><span class="bold">5.</span> Esta declaração é verdadeira em todos os seus termos.</p>

        <p>Por ser verdade, firmo a presente declaração.</p>
    </div>

    <div class="signature">
        <p>{{ empresa_cidade | default('[CIDADE]') }}, {{ data_geracao }}</p>
        <br><br><br>
        <p>_________________________________________________</p>
        <p><span class="bold">{{ representante_nome | default('[NOME DO REPRESENTANTE]') }}</span></p>
        <p>{{ representante_cargo | default('[CARGO]') }}</p>
        <p>{{ empresa_nome | default('[RAZÃO SOCIAL]') }}</p>
        <p>CNPJ: {{ empresa_cnpj | default('[CNPJ]') }}</p>
    </div>
</body>
</html>
        """
    
    def _get_declaracao_inexistencia_template(self) -> str:
        return """
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Declaração de Inexistência de Fato Impeditivo</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.8; margin: 40px; }
        .header { text-align: center; margin-bottom: 40px; }
        .content { text-align: justify; }
        .bold { font-weight: bold; }
        .signature { margin-top: 80px; text-align: center; }
    </style>
</head>
<body>
    <div class="header">
        <h2>DECLARAÇÃO DE INEXISTÊNCIA DE FATO IMPEDITIVO</h2>
    </div>

    <div class="content">
        <p>Eu, <span class="bold">{{ representante_nome | default('[NOME DO REPRESENTANTE LEGAL]') }}</span>, 
        portador do CPF nº {{ representante_cpf | default('[CPF]') }}, RG nº {{ representante_rg | default('[RG]') }}, 
        na qualidade de {{ representante_cargo | default('representante legal') }} da empresa 
        <span class="bold">{{ empresa_nome | default('[RAZÃO SOCIAL]') }}</span>, 
        inscrita no CNPJ sob o nº {{ empresa_cnpj | default('[CNPJ]') }}, 
        com sede na {{ empresa_endereco | default('[ENDEREÇO COMPLETO]') }}, 
        DECLARO, sob as penas da lei, para todos os fins de direito, especialmente para 
        participação na licitação referente ao <span class="bold">{{ edital_titulo | default('EDITAL Nº [NÚMERO/ANO]') }}</span>, 
        do(a) {{ orgao_nome | default('[ÓRGÃO LICITANTE]') }}, que:</p>

        <p><span class="bold">1.</span> Até a presente data, inexistem fatos impeditivos para 
        habilitação da empresa no presente processo licitatório;</p>

        <p><span class="bold">2.</span> A empresa não foi declarada inidônea pelo Poder Público 
        de qualquer esfera governamental;</p>

        <p><span class="bold">3.</span> Não está suspensa temporariamente de participação em 
        licitação e impedida de contratar com a Administração;</p>

        <p><span class="bold">4.</span> Compromete-se a comunicar imediatamente qualquer 
        alteração ou mudança que venha a ocorrer;</p>

        <p><span class="bold">5.</span> Está ciente de que a falsidade das informações sujeitará 
        a empresa às penalidades da lei, aplicáveis à espécie.</p>

        <p>Por ser verdade, firmo a presente declaração.</p>
    </div>

    <div class="signature">
        <p>{{ empresa_cidade | default('[CIDADE]') }}, {{ data_geracao }}</p>
        <br><br><br>
        <p>_________________________________________________</p>
        <p><span class="bold">{{ representante_nome | default('[NOME DO REPRESENTANTE]') }}</span></p>
        <p>{{ representante_cargo | default('[CARGO]') }}</p>
        <p>{{ empresa_nome | default('[RAZÃO SOCIAL]') }}</p>
        <p>CNPJ: {{ empresa_cnpj | default('[CNPJ]') }}</p>
    </div>
</body>
</html>
        """
    
    def _get_declaracao_menor_aprendiz_template(self) -> str:
        return """
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Declaração de Cumprimento ao Menor Aprendiz</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.8; margin: 40px; }
        .header { text-align: center; margin-bottom: 40px; }
        .content { text-align: justify; }
        .bold { font-weight: bold; }
        .signature { margin-top: 80px; text-align: center; }
    </style>
</head>
<body>
    <div class="header">
        <h2>DECLARAÇÃO DE CUMPRIMENTO AO DISPOSTO NO INCISO XXXIII DO ART. 7º DA CONSTITUIÇÃO FEDERAL</h2>
    </div>

    <div class="content">
        <p><span class="bold">{{ empresa_nome | default('[RAZÃO SOCIAL]') }}</span>, 
        inscrita no CNPJ nº {{ empresa_cnpj | default('[CNPJ]') }}, 
        por intermédio de seu representante legal o(a) Sr.(a) 
        <span class="bold">{{ representante_nome | default('[NOME DO REPRESENTANTE LEGAL]') }}</span>, 
        portador(a) da Carteira de Identidade nº {{ representante_rg | default('[RG]') }} 
        e do CPF nº {{ representante_cpf | default('[CPF]') }}, 
        DECLARA, para fins do disposto no inciso V do art. 27 da Lei nº 8.666, de 21 de junho de 1993, 
        acrescido pela Lei nº 9.854, de 27 de outubro de 1999, que não emprega menor de dezoito anos 
        em trabalho noturno, perigoso ou insalubre e não emprega menor de dezesseis anos.</p>

        <p>Ressalva: emprega menor, a partir de quatorze anos, na condição de aprendiz 
        ( ) sim ( ) não.</p>
        
        <p><em>(Observação: em caso afirmativo, assinalar a ressalva acima)</em></p>

        <p>Esta declaração é feita sob as penas da lei.</p>
    </div>

    <div class="signature">
        <p>{{ empresa_cidade | default('[CIDADE]') }}, {{ data_geracao }}</p>
        <br><br><br>
        <p>_________________________________________________</p>
        <p><span class="bold">{{ representante_nome | default('[NOME DO REPRESENTANTE]') }}</span></p>
        <p>{{ representante_cargo | default('[CARGO]') }}</p>
        <p>{{ empresa_nome | default('[RAZÃO SOCIAL]') }}</p>
        <p>CNPJ: {{ empresa_cnpj | default('[CNPJ]') }}</p>
    </div>
</body>
</html>
        """
    
    def _get_procuracao_template(self) -> str:
        return """
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Procuração</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.8; margin: 40px; }
        .header { text-align: center; margin-bottom: 40px; }
        .content { text-align: justify; }
        .bold { font-weight: bold; }
        .signature { margin-top: 80px; text-align: center; }
    </style>
</head>
<body>
    <div class="header">
        <h2>PROCURAÇÃO</h2>
    </div>

    <div class="content">
        <p><span class="bold">OUTORGANTE:</span> 
        <span class="bold">{{ empresa_nome | default('[RAZÃO SOCIAL]') }}</span>, 
        pessoa jurídica de direito privado, inscrita no CNPJ sob o nº {{ empresa_cnpj | default('[CNPJ]') }}, 
        com sede na {{ empresa_endereco | default('[ENDEREÇO COMPLETO]') }}, 
        neste ato representada por seu {{ representante_cargo | default('sócio-administrador') }} 
        <span class="bold">{{ representante_nome | default('[NOME DO REPRESENTANTE]') }}</span>, 
        portador do CPF nº {{ representante_cpf | default('[CPF]') }} 
        e RG nº {{ representante_rg | default('[RG]') }}.</p>

        <p><span class="bold">OUTORGADO:</span> 
        <span class="bold">{{ procurador_nome | default('[NOME DO PROCURADOR]') }}</span>, 
        {{ procurador_profissao | default('[PROFISSÃO]') }}, 
        portador do CPF nº {{ procurador_cpf | default('[CPF]') }} 
        e RG nº {{ procurador_rg | default('[RG]') }}, 
        residente e domiciliado na {{ procurador_endereco | default('[ENDEREÇO DO PROCURADOR]') }}.</p>

        <p><span class="bold">PODERES:</span> 
        Pelo presente instrumento de mandato, o OUTORGANTE confere ao OUTORGADO 
        os mais amplos e gerais poderes para o fim específico de representá-lo 
        na licitação referente ao <span class="bold">{{ edital_titulo | default('EDITAL Nº [NÚMERO/ANO]') }}</span>, 
        do(a) {{ orgao_nome | default('[ÓRGÃO LICITANTE]') }}, 
        podendo para tanto:</p>

        <ul>
            <li>Apresentar propostas e documentos de habilitação;</li>
            <li>Assinar contratos, aditivos e outros documentos;</li>
            <li>Prestar esclarecimentos e responder questionamentos;</li>
            <li>Interpor recursos e apresentar contrarrazões;</li>
            <li>Desistir de recursos;</li>
            <li>Receber notificações e intimações;</li>
            <li>Praticar todos os atos necessários ao bom e fiel desempenho do presente mandato.</li>
        </ul>

        <p>O presente instrumento é válido até {{ validade_procuracao | default('[DATA DE VALIDADE]') }}.</p>
    </div>

    <div class="signature">
        <p>{{ empresa_cidade | default('[CIDADE]') }}, {{ data_geracao }}</p>
        <br><br><br>
        <p>_________________________________________________</p>
        <p><span class="bold">{{ representante_nome | default('[NOME DO REPRESENTANTE]') }}</span></p>
        <p>{{ representante_cargo | default('[CARGO]') }}</p>
        <p>{{ empresa_nome | default('[RAZÃO SOCIAL]') }}</p>
        <p>CNPJ: {{ empresa_cnpj | default('[CNPJ]') }}</p>
        <br><br>
        <p>_________________________________________________</p>
        <p><span class="bold">{{ procurador_nome | default('[NOME DO PROCURADOR]') }}</span></p>
        <p>CPF: {{ procurador_cpf | default('[CPF]') }}</p>
    </div>
</body>
</html>
        """
    
    def _get_pedido_esclarecimento_template(self) -> str:
        return """
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Pedido de Esclarecimento</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
        .header { text-align: center; margin-bottom: 30px; }
        .content { text-align: justify; }
        .bold { font-weight: bold; }
        .signature { margin-top: 50px; text-align: center; }
        .legal-ref { font-style: italic; color: #666; font-size: 11px; }
    </style>
</head>
<body>
    <div class="header">
        <h2>PEDIDO DE ESCLARECIMENTO</h2>
        <p><span class="bold">{{ edital_titulo | default('EDITAL Nº [NÚMERO/ANO]') }}</span></p>
    </div>

    <div class="content">
        <p><span class="bold">AO(À) {{ orgao_nome | default('[ÓRGÃO LICITANTE]') }}</span></p>

        <p><span class="bold">{{ empresa_nome | default('[RAZÃO SOCIAL]') }}</span>, 
        inscrita no CNPJ nº {{ empresa_cnpj | default('[CNPJ]') }}, 
        por meio de seu representante legal, vem respeitosamente à presença de Vossa Senhoria, 
        com base no art. 23 da Lei nº 14.133/2021, solicitar esclarecimentos sobre o edital 
        em epígrafe, pelos motivos a seguir expostos:</p>

        <h3>DOS QUESTIONAMENTOS</h3>

        {% for questionamento in questionamentos | default([]) %}
        <p><span class="bold">{{ loop.index }}. {{ questionamento.titulo | default('QUESTIONAMENTO ' + loop.index|string) }}</span></p>
        <p>{{ questionamento.pergunta | default('[DESCREVER O QUESTIONAMENTO]') }}</p>
        {% if questionamento.fundamentacao %}
        <p class="legal-ref">Fundamentação: {{ questionamento.fundamentacao }}</p>
        {% endif %}
        {% endfor %}

        <h3>DOS PEDIDOS</h3>

        <p>Diante do exposto, requeremos que seja prestado esclarecimento sobre os questionamentos 
        acima formulados, nos termos do art. 23 da Lei nº 14.133/2021.</p>

        <p class="legal-ref">
        <em>Art. 23. Os interessados poderão solicitar esclarecimentos sobre o ato convocatório 
        até 3 (três) dias úteis anteriores à data fixada para abertura das propostas.</em>
        </p>

        <p>Nestes termos, pede deferimento.</p>
    </div>

    <div class="signature">
        <p>{{ empresa_cidade | default('[CIDADE]') }}, {{ data_geracao }}</p>
        <br><br>
        <p>_________________________________________________</p>
        <p><span class="bold">{{ representante_nome | default('[NOME DO REPRESENTANTE]') }}</span></p>
        <p>{{ representante_cargo | default('[CARGO]') }}</p>
        <p>{{ empresa_nome | default('[RAZÃO SOCIAL]') }}</p>
        <p>CNPJ: {{ empresa_cnpj | default('[CNPJ]') }}</p>
    </div>
</body>
</html>
        """
    
    def _get_impugnacao_template(self) -> str:
        return """
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Impugnação de Edital</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
        .header { text-align: center; margin-bottom: 30px; }
        .content { text-align: justify; }
        .bold { font-weight: bold; }
        .signature { margin-top: 50px; text-align: center; }
        .legal-ref { font-style: italic; color: #666; font-size: 11px; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h2>IMPUGNAÇÃO ADMINISTRATIVA</h2>
        <p><span class="bold">{{ edital_titulo | default('EDITAL Nº [NÚMERO/ANO]') }}</span></p>
    </div>

    <div class="content">
        <p><span class="bold">AO(À) {{ orgao_nome | default('[ÓRGÃO LICITANTE]') }}</span></p>

        <p><span class="bold">{{ empresa_nome | default('[RAZÃO SOCIAL]') }}</span>, 
        inscrita no CNPJ nº {{ empresa_cnpj | default('[CNPJ]') }}, 
        com sede na {{ empresa_endereco | default('[ENDEREÇO]') }}, 
        por meio de seu representante legal, vem respeitosamente à presença de Vossa Senhoria, 
        com base no art. 24 da Lei nº 14.133/2021, apresentar IMPUGNAÇÃO ADMINISTRATIVA 
        ao edital em epígrafe, pelos fundamentos que passa a expor:</p>

        <h3>I - DOS FATOS</h3>

        <p>{{ fatos_contexto | default('Foi publicado em [DATA] o edital da licitação em epígrafe, cujo objeto consiste em [OBJETO]. Ocorre que, após minuciosa análise do referido instrumento convocatório, verificou-se a existência de irregularidades que maculam o certame.') }}</p>

        <h3>II - DO DIREITO</h3>

        {% for irregularidade in irregularidades | default([]) %}
        <h4>{{ loop.index }}. {{ irregularidade.titulo | default('IRREGULARIDADE ' + loop.index|string) }}</h4>
        
        <p>{{ irregularidade.descricao | default('[DESCREVER A IRREGULARIDADE]') }}</p>
        
        {% if irregularidade.fundamentacao_legal %}
        <p class="legal-ref">{{ irregularidade.fundamentacao_legal }}</p>
        {% endif %}
        
        {% if irregularidade.jurisprudencia %}
        <p class="legal-ref"><strong>Jurisprudência:</strong> {{ irregularidade.jurisprudencia }}</p>
        {% endif %}
        {% endfor %}

        <h3>III - DOS PEDIDOS</h3>

        <p>Diante do exposto, requer-se:</p>
        
        <ol>
            {% for pedido in pedidos | default(['A correção das irregularidades apontadas', 'A republicação do edital corrigido']) %}
            <li>{{ pedido }}</li>
            {% endfor %}
        </ol>

        <p class="legal-ref">
        <em>Art. 24. Qualquer pessoa é parte legítima para impugnar edital de licitação 
        por irregularidade na aplicação desta Lei, devendo protocolar o pedido até 3 (três) 
        dias úteis anteriores à data fixada para abertura das propostas.</em>
        </p>

        <p>Nestes termos, pede e espera deferimento.</p>
    </div>

    <div class="signature">
        <p>{{ empresa_cidade | default('[CIDADE]') }}, {{ data_geracao }}</p>
        <br><br>
        <p>_________________________________________________</p>
        <p><span class="bold">{{ representante_nome | default('[NOME DO REPRESENTANTE]') }}</span></p>
        <p>{{ representante_cargo | default('[CARGO]') }}</p>
        <p>{{ empresa_nome | default('[RAZÃO SOCIAL]') }}</p>
        <p>CNPJ: {{ empresa_cnpj | default('[CNPJ]') }}</p>
    </div>
</body>
</html>
        """
    
    def _get_recurso_administrativo_template(self) -> str:
        return """
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Recurso Administrativo</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
        .header { text-align: center; margin-bottom: 30px; }
        .content { text-align: justify; }
        .bold { font-weight: bold; }
        .signature { margin-top: 50px; text-align: center; }
        .legal-ref { font-style: italic; color: #666; font-size: 11px; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h2>RECURSO ADMINISTRATIVO</h2>
        <p><span class="bold">{{ edital_titulo | default('EDITAL Nº [NÚMERO/ANO]') }}</span></p>
    </div>

    <div class="content">
        <p><span class="bold">AO(À) {{ orgao_nome | default('[ÓRGÃO LICITANTE]') }}</span></p>

        <p><span class="bold">{{ empresa_nome | default('[RAZÃO SOCIAL]') }}</span>, 
        inscrita no CNPJ nº {{ empresa_cnpj | default('[CNPJ]') }}, 
        com sede na {{ empresa_endereco | default('[ENDEREÇO]') }}, 
        por meio de seu representante legal, vem respeitosamente à presença de Vossa Senhoria 
        interpor RECURSO ADMINISTRATIVO contra a decisão que 
        {{ decisao_recorrida | default('[DESCREVER A DECISÃO RECORRIDA]') }}, 
        com fundamento no art. 165 da Lei nº 14.133/2021, pelas razões que passa a expor:</p>

        <h3>I - DA DECISÃO RECORRIDA</h3>

        <p>Em {{ data_decisao | default('[DATA DA DECISÃO]') }}, foi proferida decisão 
        {{ decisao_detalhes | default('que [DETALHAR A DECISÃO E SEUS FUNDAMENTOS]') }}.</p>

        <h3>II - DA TEMPESTIVIDADE</h3>

        <p>O presente recurso é tempestivo, uma vez que interposto dentro do prazo legal 
        de {{ prazo_recurso | default('3 (três) dias úteis') }}, 
        contados da {{ marco_inicial | default('intimação/ciência da decisão') }}, 
        conforme determina o art. 165, § 1º, da Lei nº 14.133/2021.</p>

        <h3>III - DAS RAZÕES RECURSAIS</h3>

        {% for razao in razoes_recurso | default([]) %}
        <h4>{{ loop.index }}. {{ razao.titulo | default('RAZÃO ' + loop.index|string) }}</h4>
        
        <p>{{ razao.argumentacao | default('[DESENVOLVER A ARGUMENTAÇÃO]') }}</p>
        
        {% if razao.fundamentacao_legal %}
        <p class="legal-ref">{{ razao.fundamentacao_legal }}</p>
        {% endif %}
        
        {% if razao.jurisprudencia %}
        <p class="legal-ref"><strong>Precedentes:</strong> {{ razao.jurisprudencia }}</p>
        {% endif %}
        {% endfor %}

        <h3>IV - DOS PEDIDOS</h3>

        <p>Diante das razões expostas, requer-se:</p>
        
        <ol>
            <li>O conhecimento e provimento do presente recurso;</li>
            {% for pedido in pedidos_especificos | default(['A reforma da decisão recorrida']) %}
            <li>{{ pedido }}</li>
            {% endfor %}
        </ol>

        <p class="legal-ref">
        <em>Art. 165. Os atos da Administração decorrentes da aplicação desta Lei serão 
        motivados, com indicação dos fatos e dos fundamentos jurídicos, quando:</em><br>
        <em>§ 1º Das decisões de habilitação ou inabilitação de licitantes e de julgamento 
        das propostas caberá recurso no prazo de 3 (três) dias úteis.</em>
        </p>

        <p>Nestes termos, pede e espera provimento.</p>
    </div>

    <div class="signature">
        <p>{{ empresa_cidade | default('[CIDADE]') }}, {{ data_geracao }}</p>
        <br><br>
        <p>_________________________________________________</p>
        <p><span class="bold">{{ representante_nome | default('[NOME DO REPRESENTANTE]') }}</span></p>
        <p>{{ representante_cargo | default('[CARGO]') }}</p>
        <p>{{ empresa_nome | default('[RAZÃO SOCIAL]') }}</p>
        <p>CNPJ: {{ empresa_cnpj | default('[CNPJ]') }}</p>
    </div>
</body>
</html>
        """
    
    def _get_contrarrazoes_template(self) -> str:
        return """
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Contrarrazões</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
        .header { text-align: center; margin-bottom: 30px; }
        .content { text-align: justify; }
        .bold { font-weight: bold; }
        .signature { margin-top: 50px; text-align: center; }
        .legal-ref { font-style: italic; color: #666; font-size: 11px; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h2>CONTRARRAZÕES DE RECURSO ADMINISTRATIVO</h2>
        <p><span class="bold">{{ edital_titulo | default('EDITAL Nº [NÚMERO/ANO]') }}</span></p>
    </div>

    <div class="content">
        <p><span class="bold">AO(À) {{ orgao_nome | default('[ÓRGÃO LICITANTE]') }}</span></p>

        <p><span class="bold">{{ empresa_nome | default('[RAZÃO SOCIAL]') }}</span>, 
        inscrita no CNPJ nº {{ empresa_cnpj | default('[CNPJ]') }}, 
        por meio de seu representante legal, vem respeitosamente à presença de Vossa Senhoria 
        apresentar CONTRARRAZÕES ao recurso administrativo interposto pela empresa 
        {{ recorrente_nome | default('[NOME DA EMPRESA RECORRENTE]') }}, 
        pelas razões que passa a expor:</p>

        <h3>I - DA TEMPESTIVIDADE</h3>

        <p>As presentes contrarrazões são tempestivas, apresentadas dentro do prazo legal 
        previsto no art. 165, § 2º, da Lei nº 14.133/2021.</p>

        <h3>II - DAS CONTRARRAZÕES</h3>

        {% for contrarrazao in contrarrazoes | default([]) %}
        <h4>{{ loop.index }}. {{ contrarrazao.titulo | default('CONTRARRAZÃO ' + loop.index|string) }}</h4>
        
        <p>{{ contrarrazao.argumentacao | default('[CONTRA-ARGUMENTAR AS RAZÕES DO RECORRENTE]') }}</p>
        
        {% if contrarrazao.fundamentacao_legal %}
        <p class="legal-ref">{{ contrarrazao.fundamentacao_legal }}</p>
        {% endif %}
        
        {% if contrarrazao.jurisprudencia %}
        <p class="legal-ref"><strong>Jurisprudência aplicável:</strong> {{ contrarrazao.jurisprudencia }}</p>
        {% endif %}
        {% endfor %}

        <h3>III - DA MANUTENÇÃO DA DECISÃO</h3>

        <p>{{ argumentos_manutencao | default('A decisão administrativa está correta e em conformidade com a legislação vigente, devendo ser mantida pelos fundamentos já expostos no ato decisório, bem como pelas contrarrazões ora apresentadas.') }}</p>

        <h3>IV - DOS PEDIDOS</h3>

        <p>Diante do exposto, requer-se:</p>
        
        <ol>
            <li>O conhecimento das presentes contrarrazões;</li>
            <li>A manutenção integral da decisão recorrida;</li>
            <li>O improvimento do recurso interposto.</li>
        </ol>

        <p class="legal-ref">
        <em>Art. 165, § 2º - O recurso será dirigido à autoridade superior, por intermédio 
        da autoridade que praticou o ato recorrido, a qual poderá reconsiderar sua decisão 
        no prazo de 5 (cinco) dias úteis ou fazê-lo subir devidamente informado, 
        devendo, neste caso, a decisão ser proferida dentro do prazo de 5 (cinco) dias úteis, 
        contado do seu recebimento, sob pena de responsabilização.</em>
        </p>

        <p>Nestes termos, pede deferimento.</p>
    </div>

    <div class="signature">
        <p>{{ empresa_cidade | default('[CIDADE]') }}, {{ data_geracao }}</p>
        <br><br>
        <p>_________________________________________________</p>
        <p><span class="bold">{{ representante_nome | default('[NOME DO REPRESENTANTE]') }}</span></p>
        <p>{{ representante_cargo | default('[CARGO]') }}</p>
        <p>{{ empresa_nome | default('[RAZÃO SOCIAL]') }}</p>
        <p>CNPJ: {{ empresa_cnpj | default('[CNPJ]') }}</p>
    </div>
</body>
</html>
        """

    async def get_available_templates(self) -> List[Dict[str, str]]:
        return [
            {'type': doc_type, 'name': name} 
            for doc_type, name in self.document_types.items()
        ]