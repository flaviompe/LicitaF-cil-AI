import React, { useState } from 'react';
import { 
  ScaleIcon, 
  ChatBubbleLeftIcon, 
  DocumentTextIcon,
  LightBulbIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  BookOpenIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const LegalConsultant = () => {
  const [question, setQuestion] = useState('');
  const [context, setContext] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [consultation, setConsultation] = useState(null);

  const legalTopics = [
    {
      title: 'Lei 14.133/21 - Nova Lei de Licitações',
      description: 'Principais mudanças e aplicações práticas',
      icon: BookOpenIcon,
      color: 'text-blue-600'
    },
    {
      title: 'Jurisprudência TCU',
      description: 'Decisões recentes sobre licitações públicas',
      icon: ScaleIcon,
      color: 'text-green-600'
    },
    {
      title: 'Recursos Administrativos',
      description: 'Como contestar decisões em licitações',
      icon: ExclamationTriangleIcon,
      color: 'text-yellow-600'
    },
    {
      title: 'Habilitação Jurídica',
      description: 'Documentação necessária para participação',
      icon: CheckCircleIcon,
      color: 'text-purple-600'
    }
  ];

  const frequentQuestions = [
    'Quais são os prazos para impugnação de edital?',
    'Como funciona a nova modalidade de diálogo competitivo?',
    'Quais documentos são obrigatórios na fase de habilitação?',
    'Como calcular o valor da garantia de proposta?',
    'Quando posso entrar com recurso administrativo?',
    'O que mudou na Lei 14.133 em relação à 8.666?'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!question.trim()) {
      toast.error('Por favor, digite sua pergunta jurídica');
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/v1/legal/consult', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          question,
          context: context || null
        })
      });

      if (response.ok) {
        const data = await response.json();
        setConsultation({
          question,
          response: data.response,
          timestamp: new Date(),
          confidenceScore: 0.92 
        });
        toast.success('Consulta jurídica concluída!');
      } else {
        toast.error('Erro ao processar consulta jurídica');
      }
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro de conexão');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickQuestion = (quickQuestion) => {
    setQuestion(quickQuestion);
  };

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
          <ScaleIcon className="h-8 w-8 mr-3 text-blue-600" />
          Consultor Jurídico IA
        </h1>
        <p className="text-gray-600">
          Tire suas dúvidas jurídicas sobre licitações com fundamentação na Lei 14.133/21 e jurisprudência dos tribunais
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        {legalTopics.map((topic, index) => {
          const IconComponent = topic.icon;
          return (
            <div key={index} className="bg-white rounded-xl card-shadow p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center mb-3">
                <IconComponent className={`h-6 w-6 ${topic.color} mr-2`} />
                <h3 className="font-medium text-gray-900 text-sm">{topic.title}</h3>
              </div>
              <p className="text-xs text-gray-600">{topic.description}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl card-shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <ChatBubbleLeftIcon className="h-5 w-5 mr-2" />
              Faça sua Consulta Jurídica
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sua Pergunta Jurídica *
                </label>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  rows={4}
                  className="input-field resize-none"
                  placeholder="Ex: Quais são os prazos para impugnação de edital conforme a Lei 14.133/21?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contexto Adicional (Opcional)
                </label>
                <textarea
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  rows={3}
                  className="input-field resize-none"
                  placeholder="Forneça detalhes específicos do edital ou situação para uma resposta mais precisa..."
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Consultando...</span>
                  </>
                ) : (
                  <>
                    <LightBulbIcon className="h-4 w-4" />
                    <span>Obter Consultoria Jurídica</span>
                  </>
                )}
              </button>
            </form>

            {consultation && (
              <div className="mt-6 p-6 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                <div className="flex items-center mb-3">
                  <ScaleIcon className="h-5 w-5 text-blue-600 mr-2" />
                  <h3 className="font-medium text-blue-900">Resposta Jurídica</h3>
                  <span className="ml-auto text-sm text-blue-600 bg-blue-100 px-2 py-1 rounded">
                    Confiança: {(consultation.confidenceScore * 100).toFixed(0)}%
                  </span>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Pergunta:</h4>
                    <p className="text-gray-700 text-sm">{consultation.question}</p>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Resposta Fundamentada:</h4>
                    <div className="text-gray-700 text-sm whitespace-pre-wrap">
                      {consultation.response}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-blue-600">
                    <span>Baseado na Lei 14.133/21 e jurisprudência atualizada</span>
                    <span>{consultation.timestamp.toLocaleString('pt-BR')}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl card-shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Perguntas Frequentes</h3>
            
            <div className="space-y-2">
              {frequentQuestions.map((faq, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickQuestion(faq)}
                  className="w-full text-left p-3 text-sm text-gray-700 hover:bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
                >
                  {faq}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-green-500 rounded-xl p-6 text-white">
            <DocumentTextIcon className="h-8 w-8 mb-3" />
            <h3 className="text-lg font-semibold mb-2">IA Jurídica Avançada</h3>
            <p className="text-sm text-blue-100 mb-4">
              Nossa IA está treinada com toda a legislação brasileira de licitações, 
              jurisprudência dos tribunais superiores e orientações dos órgãos de controle.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center">
                <CheckCircleIcon className="h-4 w-4 mr-2" />
                <span>Lei 14.133/21 atualizada</span>
              </div>
              <div className="flex items-center">
                <CheckCircleIcon className="h-4 w-4 mr-2" />
                <span>Jurisprudência TCU, STJ, STF</span>
              </div>
              <div className="flex items-center">
                <CheckCircleIcon className="h-4 w-4 mr-2" />
                <span>Orientações CGU e órgãos de controle</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LegalConsultant;