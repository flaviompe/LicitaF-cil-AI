'use client';

import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Smartphone, 
  X, 
  Download, 
  Apple, 
  Play,
  Settings,
  ExternalLink,
  Share,
  Copy,
  Check
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

interface QRCodeConfig {
  appStoreUrl: string;
  playStoreUrl: string;
  webAppUrl: string;
  dynamicLinkUrl: string;
  isConfigurable: boolean;
  customTitle: string;
  customSubtitle: string;
  showStoreIcons: boolean;
  qrCodeSize: number;
  backgroundColor: string;
  foregroundColor: string;
}

interface MobileAppLinks {
  ios: string;
  android: string;
  web: string;
  smart: string; // Dynamic link que detecta o dispositivo
}

export default function QRCodeMobile() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfigMode, setIsConfigMode] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [config, setConfig] = useState<QRCodeConfig>({
    appStoreUrl: 'https://apps.apple.com/br/app/licitafacil-pro/id123456789',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.licitafacil.pro',
    webAppUrl: 'https://app.licitafacil.pro',
    dynamicLinkUrl: 'https://licitafacil.app.link/download',
    isConfigurable: true,
    customTitle: 'Baixe nosso app',
    customSubtitle: 'Tenha acesso à plataforma onde estiver',
    showStoreIcons: true,
    qrCodeSize: 200,
    backgroundColor: '#ffffff',
    foregroundColor: '#000000'
  });

  const [mobileLinks] = useState<MobileAppLinks>({
    ios: config.appStoreUrl,
    android: config.playStoreUrl,
    web: config.webAppUrl,
    smart: config.dynamicLinkUrl
  });

  // Detectar dispositivo do usuário
  const [deviceType, setDeviceType] = useState<'ios' | 'android' | 'desktop'>('desktop');

  useEffect(() => {
    const userAgent = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(userAgent)) {
      setDeviceType('ios');
    } else if (/Android/.test(userAgent)) {
      setDeviceType('android');
    } else {
      setDeviceType('desktop');
    }
  }, []);

  const generateDynamicLink = (baseUrl: string): string => {
    // Simular Firebase Dynamic Links ou Branch.io
    const params = new URLSearchParams({
      ios_app_store_id: '123456789',
      android_package_name: 'com.licitafacil.pro',
      fallback_url: config.webAppUrl,
      utm_source: 'qr_code',
      utm_medium: 'mobile_download',
      utm_campaign: 'app_download'
    });

    return `${baseUrl}?${params.toString()}`;
  };

  const getSmartLink = (): string => {
    // Link inteligente que redireciona baseado no dispositivo
    return generateDynamicLink(config.dynamicLinkUrl);
  };

  const handleDownload = (platform: 'ios' | 'android' | 'web' | 'smart') => {
    const links = {
      ios: config.appStoreUrl,
      android: config.playStoreUrl,
      web: config.webAppUrl,
      smart: getSmartLink()
    };

    window.open(links[platform], '_blank');
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      console.error('Erro ao copiar:', error);
    }
  };

  const shareApp = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'LicitaFácil Pro',
          text: 'Baixe o app LicitaFácil Pro e tenha acesso às melhores oportunidades de licitação',
          url: getSmartLink()
        });
      } catch (error) {
        console.error('Erro ao compartilhar:', error);
      }
    } else {
      // Fallback para dispositivos que não suportam Web Share API
      copyToClipboard(getSmartLink(), 'share');
    }
  };

  const QRCodeWidget = () => (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-lg border border-slate-200 dark:border-slate-700"
    >
      <div className="text-center space-y-4">
        
        {/* Título e Subtítulo */}
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {config.customTitle}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {config.customSubtitle}
          </p>
        </div>

        {/* QR Code */}
        <div className="flex justify-center p-4 bg-white rounded-lg">
          <QRCodeSVG
            value={getSmartLink()}
            size={config.qrCodeSize}
            bgColor={config.backgroundColor}
            fgColor={config.foregroundColor}
            level="M"
            includeMargin={true}
          />
        </div>

        {/* Ícones das Lojas */}
        {config.showStoreIcons && (
          <div className="flex justify-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownload('ios')}
              className="flex items-center space-x-2"
            >
              <Apple className="w-4 h-4" />
              <span>App Store</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownload('android')}
              className="flex items-center space-x-2"
            >
              <Play className="w-4 h-4" />
              <span>Play Store</span>
            </Button>
          </div>
        )}

        {/* Link direto para o dispositivo atual */}
        <div className="pt-2">
          <Button
            onClick={() => handleDownload('smart')}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Baixar Agora
          </Button>
        </div>

        {/* Botões de ação */}
        <div className="flex justify-center space-x-2 pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={shareApp}
            className="flex items-center space-x-1"
          >
            <Share className="w-3 h-3" />
            <span>Compartilhar</span>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-1"
          >
            <ExternalLink className="w-3 h-3" />
            <span>Mais opções</span>
          </Button>
          
          {config.isConfigurable && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsConfigMode(true)}
              className="flex items-center space-x-1"
            >
              <Settings className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );

  const ConfigurationPanel = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Configurações do QR Code
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsConfigMode(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* URLs das Lojas */}
          <div className="space-y-3">
            <Label>App Store URL</Label>
            <Input
              value={config.appStoreUrl}
              onChange={(e) => setConfig(prev => ({ ...prev, appStoreUrl: e.target.value }))}
              placeholder="https://apps.apple.com/..."
            />
          </div>

          <div className="space-y-3">
            <Label>Play Store URL</Label>
            <Input
              value={config.playStoreUrl}
              onChange={(e) => setConfig(prev => ({ ...prev, playStoreUrl: e.target.value }))}
              placeholder="https://play.google.com/store/..."
            />
          </div>

          <div className="space-y-3">
            <Label>Web App URL</Label>
            <Input
              value={config.webAppUrl}
              onChange={(e) => setConfig(prev => ({ ...prev, webAppUrl: e.target.value }))}
              placeholder="https://app.licitafacil.pro"
            />
          </div>

          <div className="space-y-3">
            <Label>Dynamic Link URL</Label>
            <Input
              value={config.dynamicLinkUrl}
              onChange={(e) => setConfig(prev => ({ ...prev, dynamicLinkUrl: e.target.value }))}
              placeholder="https://licitafacil.app.link/download"
            />
          </div>

          {/* Textos Personalizados */}
          <div className="space-y-3">
            <Label>Título</Label>
            <Input
              value={config.customTitle}
              onChange={(e) => setConfig(prev => ({ ...prev, customTitle: e.target.value }))}
              placeholder="Baixe nosso app"
            />
          </div>

          <div className="space-y-3">
            <Label>Subtítulo</Label>
            <Input
              value={config.customSubtitle}
              onChange={(e) => setConfig(prev => ({ ...prev, customSubtitle: e.target.value }))}
              placeholder="Tenha acesso à plataforma onde estiver"
            />
          </div>

          {/* Configurações do QR Code */}
          <div className="space-y-3">
            <Label>Tamanho do QR Code</Label>
            <Input
              type="number"
              min="100"
              max="400"
              value={config.qrCodeSize}
              onChange={(e) => setConfig(prev => ({ ...prev, qrCodeSize: parseInt(e.target.value) }))}
            />
          </div>

          <div className="space-y-3">
            <Label>Cor de Fundo</Label>
            <Input
              type="color"
              value={config.backgroundColor}
              onChange={(e) => setConfig(prev => ({ ...prev, backgroundColor: e.target.value }))}
            />
          </div>

          <div className="space-y-3">
            <Label>Cor do QR Code</Label>
            <Input
              type="color"
              value={config.foregroundColor}
              onChange={(e) => setConfig(prev => ({ ...prev, foregroundColor: e.target.value }))}
            />
          </div>

        </div>

        {/* Switches */}
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.showStoreIcons}
              onChange={(e) => setConfig(prev => ({ ...prev, showStoreIcons: e.target.checked }))}
              className="rounded"
            />
            <span>Mostrar ícones das lojas</span>
          </label>
        </div>

        {/* Preview */}
        <div className="pt-4 border-t">
          <Label>Preview</Label>
          <div className="mt-2 flex justify-center">
            <div className="scale-75">
              <QRCodeWidget />
            </div>
          </div>
        </div>

      </CardContent>
    </Card>
  );

  const DetailedModal = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setIsModalOpen(false);
        }
      }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-slate-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Smartphone className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Download LicitaFácil Pro
              </h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsModalOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="p-6">
          <Tabs defaultValue="qr" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="qr">QR Code</TabsTrigger>
              <TabsTrigger value="links">Links Diretos</TabsTrigger>
              <TabsTrigger value="embed">Incorporar</TabsTrigger>
            </TabsList>

            <TabsContent value="qr" className="mt-6">
              <div className="text-center space-y-6">
                
                {/* QR Code Grande */}
                <div className="flex justify-center">
                  <div className="p-6 bg-white rounded-lg shadow-lg">
                    <QRCodeSVG
                      value={getSmartLink()}
                      size={250}
                      bgColor="#ffffff"
                      fgColor="#000000"
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                </div>

                {/* Instruções */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Como usar o QR Code</h3>
                  <div className="text-left space-y-2 max-w-md mx-auto">
                    <div className="flex items-start space-x-3">
                      <Badge variant="outline" className="mt-0.5">1</Badge>
                      <p className="text-sm">Abra a câmera do seu celular ou um leitor de QR Code</p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Badge variant="outline" className="mt-0.5">2</Badge>
                      <p className="text-sm">Aponte para o código QR acima</p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Badge variant="outline" className="mt-0.5">3</Badge>
                      <p className="text-sm">Toque na notificação que aparecer</p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Badge variant="outline" className="mt-0.5">4</Badge>
                      <p className="text-sm">Você será direcionado para a loja do seu dispositivo</p>
                    </div>
                  </div>
                </div>

                {/* Detecção de Dispositivo */}
                <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <Smartphone className="w-4 h-4" />
                    <span className="text-sm font-medium">Dispositivo detectado:</span>
                    <Badge variant="secondary">
                      {deviceType === 'ios' ? 'iOS' : deviceType === 'android' ? 'Android' : 'Desktop'}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 text-center">
                    O QR Code direcionará automaticamente para a loja adequada
                  </p>
                </div>

              </div>
            </TabsContent>

            <TabsContent value="links" className="mt-6">
              <div className="space-y-4">
                
                {/* Links por Plataforma */}
                <div className="space-y-3">
                  
                  {/* iOS */}
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Apple className="w-5 h-5" />
                      <div>
                        <div className="font-medium">App Store (iOS)</div>
                        <div className="text-xs text-slate-500">iPhone, iPad</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(config.appStoreUrl, 'ios')}
                      >
                        {copied === 'ios' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleDownload('ios')}
                      >
                        Abrir
                      </Button>
                    </div>
                  </div>

                  {/* Android */}
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Play className="w-5 h-5" />
                      <div>
                        <div className="font-medium">Google Play (Android)</div>
                        <div className="text-xs text-slate-500">Dispositivos Android</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(config.playStoreUrl, 'android')}
                      >
                        {copied === 'android' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleDownload('android')}
                      >
                        Abrir
                      </Button>
                    </div>
                  </div>

                  {/* Web App */}
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <ExternalLink className="w-5 h-5" />
                      <div>
                        <div className="font-medium">Web App</div>
                        <div className="text-xs text-slate-500">Qualquer navegador</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(config.webAppUrl, 'web')}
                      >
                        {copied === 'web' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleDownload('web')}
                      >
                        Abrir
                      </Button>
                    </div>
                  </div>

                  {/* Smart Link */}
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-blue-50 dark:bg-blue-900/20">
                    <div className="flex items-center space-x-3">
                      <Smartphone className="w-5 h-5 text-blue-600" />
                      <div>
                        <div className="font-medium text-blue-600">Link Inteligente</div>
                        <div className="text-xs text-blue-500">Detecta automaticamente o dispositivo</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(getSmartLink(), 'smart')}
                      >
                        {copied === 'smart' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleDownload('smart')}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Usar
                      </Button>
                    </div>
                  </div>

                </div>

                {/* Compartilhamento */}
                <div className="pt-4 border-t">
                  <Button
                    onClick={shareApp}
                    variant="outline"
                    className="w-full"
                  >
                    <Share className="w-4 h-4 mr-2" />
                    Compartilhar com outros
                  </Button>
                </div>

              </div>
            </TabsContent>

            <TabsContent value="embed" className="mt-6">
              <div className="space-y-4">
                
                <div>
                  <Label>Código HTML para incorporar</Label>
                  <div className="mt-2 relative">
                    <textarea
                      className="w-full h-32 p-3 text-xs font-mono bg-slate-50 dark:bg-slate-700 border rounded-lg resize-none"
                      readOnly
                      value={`<div style="text-align: center; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
  <h3>${config.customTitle}</h3>
  <p style="color: #64748b; margin-bottom: 16px;">${config.customSubtitle}</p>
  <div style="margin: 16px 0;">
    <img src="https://api.qrserver.com/v1/create-qr-code/?size=${config.qrCodeSize}x${config.qrCodeSize}&data=${encodeURIComponent(getSmartLink())}" alt="QR Code LicitaFácil Pro" />
  </div>
  <div style="margin-top: 16px;">
    <a href="${getSmartLink()}" target="_blank" style="display: inline-block; padding: 8px 16px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px;">Baixar App</a>
  </div>
</div>`}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(
                        `<div style="text-align: center; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">...</div>`,
                        'embed'
                      )}
                    >
                      {copied === 'embed' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    </Button>
                  </div>
                </div>

                <div>
                  <Label>Preview do Widget</Label>
                  <div className="mt-2 p-4 border rounded-lg bg-slate-50 dark:bg-slate-700">
                    <div className="scale-75 origin-top">
                      <QRCodeWidget />
                    </div>
                  </div>
                </div>

              </div>
            </TabsContent>

          </Tabs>
        </div>
      </motion.div>
    </motion.div>
  );

  if (isConfigMode) {
    return <ConfigurationPanel />;
  }

  return (
    <>
      <QRCodeWidget />
      
      <AnimatePresence>
        {isModalOpen && <DetailedModal />}
      </AnimatePresence>
    </>
  );
}

// Componente para uso em diferentes posições
export function QRCodeMobileCompact() {
  return (
    <div className="fixed bottom-4 right-4 z-40">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.05 }}
        className="bg-white dark:bg-slate-800 rounded-full shadow-lg p-3 border border-slate-200 dark:border-slate-700"
      >
        <Button
          size="sm"
          variant="ghost"
          className="rounded-full"
          onClick={() => {
            // Abrir modal ou redirecionar
            window.open('https://licitafacil.app.link/download', '_blank');
          }}
        >
          <Smartphone className="w-4 h-4" />
        </Button>
      </motion.div>
    </div>
  );
}

// Hook para gerenciar configurações
export function useQRCodeConfig() {
  const [config, setConfig] = useState<QRCodeConfig>({
    appStoreUrl: '',
    playStoreUrl: '',
    webAppUrl: '',
    dynamicLinkUrl: '',
    isConfigurable: true,
    customTitle: 'Baixe nosso app',
    customSubtitle: 'Tenha acesso à plataforma onde estiver',
    showStoreIcons: true,
    qrCodeSize: 200,
    backgroundColor: '#ffffff',
    foregroundColor: '#000000'
  });

  const updateConfig = (updates: Partial<QRCodeConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const resetConfig = () => {
    setConfig({
      appStoreUrl: '',
      playStoreUrl: '',
      webAppUrl: '',
      dynamicLinkUrl: '',
      isConfigurable: true,
      customTitle: 'Baixe nosso app',
      customSubtitle: 'Tenha acesso à plataforma onde estiver',
      showStoreIcons: true,
      qrCodeSize: 200,
      backgroundColor: '#ffffff',
      foregroundColor: '#000000'
    });
  };

  return {
    config,
    updateConfig,
    resetConfig
  };
}