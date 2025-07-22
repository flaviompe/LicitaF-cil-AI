import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  DocumentTextIcon, 
  CloudArrowUpIcon, 
  EyeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  DocumentArrowUpIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const DocumentAnalyzer = () => {
  const [file, setFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [extractedText, setExtractedText] = useState('');

  const onDrop = useCallback((acceptedFiles) => {
    const uploadedFile = acceptedFiles[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      setAnalysis(null);
      setExtractedText('');
      toast.success('Documento carregado com sucesso!');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'image/*': ['.png', '.jpg', '.jpeg']
    },
    multiple: false,
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  const analyzeDocument = async () => {
    if (!file) {
      toast.error('Selecione um arquivo primeiro');
      return;
    }

    setIsAnalyzing(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await fetch('/api/v1/documents/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (uploadResponse.ok) {
        const uploadData = await uploadResponse.json();
        
        const analyzeResponse = await fetch('/api/v1/documents/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            file_url: uploadData.file_url
          })
        });

        if (analyzeResponse.ok) {
          const data = await analyzeResponse.json();
          setAnalysis(data.analysis);
          setExtractedText(data.extracted_text);
          toast.success('Análise jurídica concluída!');
        } else {
          toast.error('Erro ao analisar documento');
        }
      } else {
        toast.error('Erro ao fazer upload do arquivo');
      }
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro de conexão');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getComplianceColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getComplianceIcon = (score) => {
    if (score >= 80) return <CheckCircleIcon className="h-5 w-5" />;
    if (score >= 60) return <ExclamationTriangleIcon className="h-5 w-5" />;
    return <XCircleIcon className="h-5 w-5" />;
  };

  const mockAnalysis = {
    document_type: "Edital de Licitação",
    compliance_score: 78,
    key_requirements: [
      "Registro na Junta Comercial",
      "Certidão Negativa de Débitos Federais",
      "Comprovação de Regularidade no FGTS",
      "Declaração de Cumprimento ao Menor Aprendiz"
    ],
    legal_risks: [
      "Prazo de habilitação muito restrito (3 dias úteis)",
      "Exigência de certidão estadual específica não mencionada na Lei",
      "Critério de desempate não está claramente definido"
    ],
    missing_documents: [
      "Declaração de Inexistência de Fato Impeditivo",
      "Comprovação de Aptidão Técnica"
    ],
    recommendations: [
      "Solicitar esclarecimento sobre o prazo de habilitação",
      "Preparar todos os documentos com 15 dias de antecedência",
      "Verificar jurisprudência sobre exigências similares"
    ]
  };

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
          <DocumentArrowUpIcon className="h-8 w-8 mr-3 text-blue-600" />
          Analisador de Documentos com IA
        </h1>
        <p className="text-gray-600">
          Faça upload de editais e documentos para análise jurídica automatizada e verificação de conformidade
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl card-shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload de Documento</h2>
            
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragActive 
                  ? 'border-blue-400 bg-blue-50' 
                  : 'border-gray-300 hover:border-blue-400'
              }`}
            >
              <input {...getInputProps()} />
              
              <CloudArrowUpIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              
              {file ? (
                <div>
                  <p className="text-green-600 font-medium mb-2">✓ Arquivo selecionado:</p>
                  <p className="text-gray-700 text-sm">{file.name}</p>
                  <p className="text-gray-500 text-xs">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-gray-600 mb-2">
                    {isDragActive 
                      ? 'Solte o arquivo aqui...' 
                      : 'Arraste um arquivo ou clique para selecionar'
                    }
                  </p>
                  <p className="text-gray-500 text-sm">
                    Suporta PDF, DOC, DOCX e imagens (máx. 10MB)
                  </p>
                </div>
              )}
            </div>

            {file && (
              <button
                onClick={analyzeDocument}
                disabled={isAnalyzing}
                className="btn-primary w-full mt-4 flex items-center justify-center space-x-2"
              >
                {isAnalyzing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Analisando documento...</span>
                  </>
                ) : (
                  <>
                    <EyeIcon className="h-4 w-4" />
                    <span>Analisar Documento com IA</span>
                  </>
                )}
              </button>
            )}
          </div>

          {(analysis || mockAnalysis) && (
            <div className="bg-white rounded-xl card-shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <DocumentTextIcon className="h-5 w-5 mr-2" />
                Análise Jurídica Completa
              </h2>

              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-lg border-2 border-gray-200">
                  <div>
                    <h3 className="font-medium text-gray-900">Score de Conformidade</h3>
                    <p className="text-sm text-gray-600">Baseado na Lei 14.133/21</p>
                  </div>
                  <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${getComplianceColor((analysis || mockAnalysis).compliance_score)}`}>
                    {getComplianceIcon((analysis || mockAnalysis).compliance_score)}
                    <span className="text-2xl font-bold">
                      {(analysis || mockAnalysis).compliance_score}%
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                      <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
                      Requisitos Identificados
                    </h3>
                    <ul className="space-y-2">
                      {(analysis || mockAnalysis).key_requirements.map((req, index) => (
                        <li key={index} className="text-sm text-gray-700 flex items-start">
                          <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                          {req}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                      <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500 mr-2" />
                      Riscos Jurídicos
                    </h3>
                    <ul className="space-y-2">
                      {(analysis || mockAnalysis).legal_risks.map((risk, index) => (
                        <li key={index} className="text-sm text-gray-700 flex items-start">
                          <span className="w-2 h-2 bg-yellow-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                          {risk}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                    <XCircleIcon className="h-4 w-4 text-red-500 mr-2" />
                    Documentos Faltantes
                  </h3>
                  <div className="bg-red-50 rounded-lg p-4">
                    <ul className="space-y-1">
                      {(analysis || mockAnalysis).missing_documents.map((doc, index) => (
                        <li key={index} className="text-sm text-red-700 flex items-center">
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2"></span>
                          {doc}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                    <CheckCircleIcon className="h-4 w-4 text-blue-500 mr-2" />
                    Recomendações Estratégicas
                  </h3>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <ul className="space-y-2">
                      {(analysis || mockAnalysis).recommendations.map((rec, index) => (
                        <li key={index} className="text-sm text-blue-700 flex items-start">
                          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl card-shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Capacidades da IA</h3>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-gray-900 text-sm">OCR Avançado</h4>
                  <p className="text-xs text-gray-600">Extração de texto de PDFs e imagens</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-gray-900 text-sm">Análise Jurídica</h4>
                  <p className="text-xs text-gray-600">Verificação de conformidade legal</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-gray-900 text-sm">Detecção de Riscos</h4>
                  <p className="text-xs text-gray-600">Identificação automática de problemas</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-gray-900 text-sm">Recomendações</h4>
                  <p className="text-xs text-gray-600">Sugestões estratégicas personalizadas</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl p-6 text-white">
            <DocumentTextIcon className="h-8 w-8 mb-3" />
            <h3 className="text-lg font-semibold mb-2">Tipos de Documentos</h3>
            <div className="space-y-2 text-sm">
              <div>📄 Editais de Licitação</div>
              <div>📋 Termos de Referência</div>
              <div>📑 Contratos Públicos</div>
              <div>🏛️ Atos Normativos</div>
              <div>⚖️ Pareceres Jurídicos</div>
              <div>📊 Relatórios Técnicos</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentAnalyzer;