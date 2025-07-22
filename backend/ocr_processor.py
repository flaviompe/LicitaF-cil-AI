import pytesseract
from PIL import Image
import requests
import os
import tempfile
from typing import Dict, Any
import asyncio
import aiohttp

class OCRProcessor:
    def __init__(self):
        pytesseract.pytesseract.tesseract_cmd = os.getenv('TESSERACT_PATH', '/usr/bin/tesseract')
        self.supported_formats = ['.pdf', '.png', '.jpg', '.jpeg', '.tiff', '.bmp']
    
    async def extract_text(self, file_url: str) -> str:
        try:
            with tempfile.TemporaryDirectory() as temp_dir:
                file_path = await self._download_file(file_url, temp_dir)
                
                if file_path.lower().endswith('.pdf'):
                    return await self._extract_from_pdf(file_path)
                else:
                    return await self._extract_from_image(file_path)
                    
        except Exception as e:
            return f"Erro na extração de texto: {str(e)}"
    
    async def _download_file(self, url: str, temp_dir: str) -> str:
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                if response.status == 200:
                    filename = url.split('/')[-1] or 'document'
                    file_path = os.path.join(temp_dir, filename)
                    
                    with open(file_path, 'wb') as f:
                        async for chunk in response.content.iter_chunked(8192):
                            f.write(chunk)
                    
                    return file_path
                else:
                    raise Exception(f"Falha no download: {response.status}")
    
    async def _extract_from_image(self, image_path: str) -> str:
        def extract():
            image = Image.open(image_path)
            
            custom_config = r'--oem 3 --psm 6 -l por'
            text = pytesseract.image_to_string(image, config=custom_config)
            
            return text.strip()
        
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, extract)
    
    async def _extract_from_pdf(self, pdf_path: str) -> str:
        try:
            import fitz
            
            def extract():
                doc = fitz.open(pdf_path)
                text = ""
                
                for page_num in range(len(doc)):
                    page = doc.load_page(page_num)
                    text += page.get_text()
                
                doc.close()
                return text.strip()
            
            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(None, extract)
            
        except ImportError:
            return await self._pdf_to_images_ocr(pdf_path)
    
    async def _pdf_to_images_ocr(self, pdf_path: str) -> str:
        try:
            from pdf2image import convert_from_path
            
            def extract():
                pages = convert_from_path(pdf_path)
                full_text = ""
                
                for page in pages:
                    custom_config = r'--oem 3 --psm 6 -l por'
                    text = pytesseract.image_to_string(page, config=custom_config)
                    full_text += text + "\n"
                
                return full_text.strip()
            
            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(None, extract)
            
        except ImportError:
            return "Erro: Bibliotecas PDF não instaladas. Instale PyMuPDF ou pdf2image."
    
    async def extract_structured_data(self, file_url: str) -> Dict[str, Any]:
        text = await self.extract_text(file_url)
        
        if "erro" in text.lower():
            return {"error": text}
        
        structured_data = {
            "raw_text": text,
            "word_count": len(text.split()),
            "char_count": len(text),
            "extracted_at": asyncio.get_event_loop().time(),
            "contains_tables": "tabela" in text.lower() or "|" in text,
            "contains_signatures": "assinatura" in text.lower() or "assina:" in text.lower(),
            "document_sections": self._identify_sections(text)
        }
        
        return structured_data
    
    def _identify_sections(self, text: str) -> Dict[str, bool]:
        sections = {
            "objeto": "objeto" in text.lower(),
            "valor_estimado": any(term in text.lower() for term in ["valor", "preço", "r$"]),
            "prazo": "prazo" in text.lower(),
            "documentos": "documento" in text.lower(),
            "habilitacao": "habilita" in text.lower(),
            "recurso": "recurso" in text.lower(),
            "cronograma": "cronograma" in text.lower() or "data" in text.lower(),
        }
        
        return sections