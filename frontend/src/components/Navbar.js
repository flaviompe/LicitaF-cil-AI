import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  HomeIcon, 
  MagnifyingGlassIcon, 
  ScaleIcon, 
  DocumentTextIcon,
  ChartBarIcon,
  BellIcon,
  Cog6ToothIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline';

const Navbar = () => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: HomeIcon },
    { name: 'Oportunidades', href: '/opportunities', icon: MagnifyingGlassIcon },
    { name: 'Consultor Jurídico', href: '/legal', icon: ScaleIcon },
    { name: 'Analisar Documentos', href: '/documents', icon: DocumentTextIcon },
    { name: 'Monitores', href: '/monitors', icon: BellIcon },
    { name: 'Relatórios', href: '/reports', icon: ChartBarIcon },
  ];

  const isActive = (href) => location.pathname === href;

  return (
    <nav className="gradient-bg shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <div className="flex-shrink-0">
              <h1 className="text-white text-xl font-bold">
                🏛️ Licitações IA
              </h1>
            </div>
            
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                {navigation.map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`px-3 py-2 rounded-md text-sm font-medium flex items-center space-x-2 transition-colors duration-200 ${
                        isActive(item.href)
                          ? 'bg-white bg-opacity-20 text-white'
                          : 'text-blue-100 hover:bg-white hover:bg-opacity-10 hover:text-white'
                      }`}
                    >
                      <IconComponent className="h-4 w-4" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="hidden md:block">
            <div className="ml-4 flex items-center md:ml-6 space-x-4">
              <button className="bg-white bg-opacity-20 p-1 rounded-full text-blue-100 hover:text-white hover:bg-opacity-30 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600">
                <BellIcon className="h-6 w-6" />
              </button>
              
              <button className="bg-white bg-opacity-20 p-1 rounded-full text-blue-100 hover:text-white hover:bg-opacity-30 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600">
                <Cog6ToothIcon className="h-6 w-6" />
              </button>

              <div className="relative">
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center space-x-2 text-blue-100 hover:text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600 rounded-md p-2"
                >
                  <UserCircleIcon className="h-8 w-8" />
                  <span className="text-sm font-medium">Empresa</span>
                </button>

                {isProfileOpen && (
                  <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                    <div className="py-1">
                      <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        Meu Perfil
                      </a>
                      <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        Configurações
                      </a>
                      <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        Histórico
                      </a>
                      <hr className="my-1" />
                      <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        Sair
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="md:hidden">
            <button className="inline-flex items-center justify-center p-2 rounded-md text-blue-100 hover:text-white hover:bg-white hover:bg-opacity-10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white">
              <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;