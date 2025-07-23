'use client';

import { Fragment } from 'react'
import { Menu, Transition } from '@headlessui/react'
import {
  BellIcon,
  Cog6ToothIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'
import { ChevronDownIcon } from '@heroicons/react/20/solid'
import Link from 'next/link'

const userNavigation = [
  { name: 'Seu perfil', href: '/admin/profile' },
  { name: 'Configurações', href: '/admin/settings' },
  { name: 'Ajuda', href: '/admin/help' },
  { name: 'Sair', href: '/logout' },
]

const notifications = [
  { id: 1, message: 'Nova empresa cadastrada', time: '5 min', unread: true },
  { id: 2, message: 'Backup concluído com sucesso', time: '1 hora', unread: true },
  { id: 3, message: 'Sistema atualizado', time: '2 horas', unread: false },
]

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

interface AdminHeaderProps {
  user?: {
    name: string
    email: string
    imageUrl?: string
    role?: string
  }
  onMobileMenuClick?: () => void
}

export default function AdminHeader({ user, onMobileMenuClick }: AdminHeaderProps) {
  const unreadCount = notifications.filter(n => n.unread).length

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between items-center">
          
          {/* Left side - Search and breadcrumb */}
          <div className="flex items-center space-x-4 flex-1">
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold text-gray-900">
                Painel Administrativo
              </h1>
              <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                LicitaFácil AI
              </span>
            </div>
            
            {/* Search bar */}
            <div className="hidden md:block flex-1 max-w-lg">
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <input
                  id="search"
                  name="search"
                  className="block w-full rounded-md border-0 bg-gray-50 py-1.5 pl-10 pr-3 text-gray-900 placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-blue-500 sm:text-sm sm:leading-6"
                  placeholder="Buscar usuários, empresas, licitações..."
                  type="search"
                />
              </div>
            </div>
          </div>

          {/* Right side - Actions and user menu */}
          <div className="flex items-center space-x-4">
            
            {/* Quick Actions */}
            <div className="hidden lg:flex items-center space-x-2">
              <Link
                href="/admin/settings"
                className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              >
                <Cog6ToothIcon className="h-4 w-4 mr-2" />
                Configurações
              </Link>
            </div>

            {/* Notifications */}
            <Menu as="div" className="relative">
              <Menu.Button className="relative rounded-full bg-white p-1 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                <span className="sr-only">Ver notificações</span>
                <BellIcon className="h-6 w-6" aria-hidden="true" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                    {unreadCount}
                  </span>
                )}
              </Menu.Button>
              <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Menu.Items className="absolute right-0 z-10 mt-2 w-80 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <h3 className="text-sm font-medium text-gray-900">Notificações</h3>
                  </div>
                  {notifications.map((notification) => (
                    <Menu.Item key={notification.id}>
                      {({ active }) => (
                        <div
                          className={classNames(
                            active ? 'bg-gray-50' : '',
                            'flex px-4 py-3 text-sm'
                          )}
                        >
                          <div className="flex-1">
                            <p className={classNames(
                              notification.unread ? 'font-medium text-gray-900' : 'text-gray-600'
                            )}>
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-400">{notification.time}</p>
                          </div>
                          {notification.unread && (
                            <div className="flex-shrink-0">
                              <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                            </div>
                          )}
                        </div>
                      )}
                    </Menu.Item>
                  ))}
                  <div className="border-t border-gray-100 px-4 py-2">
                    <Link href="/admin/notifications" className="text-sm text-blue-600 hover:text-blue-500">
                      Ver todas as notificações
                    </Link>
                  </div>
                </Menu.Items>
              </Transition>
            </Menu>

            {/* Profile dropdown */}
            <Menu as="div" className="relative">
              <div>
                <Menu.Button className="flex max-w-xs items-center rounded-full bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 lg:rounded-md lg:p-2 lg:hover:bg-gray-50">
                  <img
                    className="h-8 w-8 rounded-full"
                    src={user?.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'Admin')}&background=3b82f6&color=fff`}
                    alt=""
                  />
                  <span className="hidden ml-3 text-gray-700 text-sm font-medium lg:block">
                    <span className="sr-only">Abrir menu do usuário para </span>
                    {user?.name || 'Administrador'}
                  </span>
                  <ChevronDownIcon
                    className="hidden ml-1 h-5 w-5 flex-shrink-0 text-gray-400 lg:block"
                    aria-hidden="true"
                  />
                </Menu.Button>
              </div>
              <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm text-gray-900 font-medium">{user?.name || 'Administrador'}</p>
                    <p className="text-sm text-gray-500">{user?.email || 'admin@licitafacil.ai'}</p>
                    {user?.role && (
                      <p className="text-xs text-blue-600 font-medium mt-1">{user.role}</p>
                    )}
                  </div>
                  {userNavigation.map((item) => (
                    <Menu.Item key={item.name}>
                      {({ active }) => (
                        <Link
                          href={item.href}
                          className={classNames(
                            active ? 'bg-gray-50' : '',
                            'block px-4 py-2 text-sm text-gray-700'
                          )}
                        >
                          {item.name}
                        </Link>
                      )}
                    </Menu.Item>
                  ))}
                </Menu.Items>
              </Transition>
            </Menu>
          </div>
        </div>
      </div>
      
      {/* Mobile search */}
      <div className="md:hidden px-4 pb-4">
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </div>
          <input
            id="mobile-search"
            name="search"
            className="block w-full rounded-md border-0 bg-gray-50 py-1.5 pl-10 pr-3 text-gray-900 placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-blue-500 sm:text-sm sm:leading-6"
            placeholder="Buscar..."
            type="search"
          />
        </div>
      </div>
    </header>
  )
}