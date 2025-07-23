'use client';

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Star, 
  ThumbsUp, 
  ThumbsDown, 
  Flag, 
  MessageSquare, 
  Calendar,
  Award,
  CheckCircle,
  AlertCircle,
  Filter,
  SortDesc,
  MoreHorizontal,
  User,
  Building
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Review {
  id: string
  clientId: string
  clientName: string
  clientCompany?: string
  rating: number
  title: string
  comment: string
  contractId?: string
  projectValue?: number
  projectType?: string
  createdAt: Date
  helpful: number
  notHelpful: number
  verified: boolean
  response?: {
    content: string
    respondedAt: Date
    respondedBy: string
  }
  aspects: {
    communication: number
    quality: number
    deadline: number
    value: number
  }
}

interface RatingSystemProps {
  supplierId: string
  reviews: Review[]
  canReview?: boolean
  averageRating: number
  totalReviews: number
  ratingBreakdown: {
    5: number
    4: number
    3: number
    2: number
    1: number
  }
  aspectsAverage: {
    communication: number
    quality: number
    deadline: number
    value: number
  }
}

export function RatingSystem({
  supplierId,
  reviews,
  canReview = false,
  averageRating,
  totalReviews,
  ratingBreakdown,
  aspectsAverage
}: RatingSystemProps) {
  const [showReviewDialog, setShowReviewDialog] = useState(false)
  const [filterRating, setFilterRating] = useState<number | null>(null)
  const [sortBy, setSortBy] = useState<'recent' | 'helpful' | 'rating'>('recent')
  const [newReview, setNewReview] = useState({
    rating: 0,
    title: '',
    comment: '',
    aspects: {
      communication: 0,
      quality: 0,
      deadline: 0,
      value: 0
    }
  })

  const submitReview = async () => {
    try {
      const response = await fetch(`/api/marketplace/suppliers/${supplierId}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newReview)
      })
      
      if (response.ok) {
        setShowReviewDialog(false)
        setNewReview({
          rating: 0,
          title: '',
          comment: '',
          aspects: {
            communication: 0,
            quality: 0,
            deadline: 0,
            value: 0
          }
        })
        // Refresh reviews
        window.location.reload()
      }
    } catch (error) {
      console.error('Erro ao enviar avaliação:', error)
    }
  }

  const markHelpful = async (reviewId: string, helpful: boolean) => {
    try {
      await fetch(`/api/marketplace/reviews/${reviewId}/helpful`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ helpful })
      })
      // Refresh reviews
      window.location.reload()
    } catch (error) {
      console.error('Erro ao marcar como útil:', error)
    }
  }

  const reportReview = async (reviewId: string, reason: string) => {
    try {
      await fetch(`/api/marketplace/reviews/${reviewId}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      })
      alert('Avaliação reportada com sucesso!')
    } catch (error) {
      console.error('Erro ao reportar avaliação:', error)
    }
  }

  const renderStars = (rating: number, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClass = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5'
    
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={cn(
          sizeClass,
          i < Math.floor(rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'
        )}
      />
    ))
  }

  const renderInteractiveStars = (rating: number, onRatingChange: (rating: number) => void) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={cn(
          'h-6 w-6 cursor-pointer transition-colors',
          i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300 hover:text-yellow-400'
        )}
        onClick={() => onRatingChange(i + 1)}
      />
    ))
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const filteredReviews = reviews.filter(review => 
    filterRating === null || review.rating === filterRating
  )

  const sortedReviews = [...filteredReviews].sort((a, b) => {
    switch (sortBy) {
      case 'recent':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      case 'helpful':
        return b.helpful - a.helpful
      case 'rating':
        return b.rating - a.rating
      default:
        return 0
    }
  })

  return (
    <div className="space-y-6">
      {/* Overall Rating */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Avaliações dos Clientes</span>
            {canReview && (
              <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Star className="h-4 w-4 mr-2" />
                    Avaliar Fornecedor
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Avaliar Fornecedor</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6">
                    <div>
                      <Label className="text-base font-medium">Avaliação Geral</Label>
                      <div className="flex items-center space-x-2 mt-2">
                        {renderInteractiveStars(newReview.rating, (rating) => 
                          setNewReview(prev => ({ ...prev, rating }))
                        )}
                        <span className="text-sm text-gray-500">
                          {newReview.rating > 0 ? `${newReview.rating}/5` : 'Selecione uma nota'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="title">Título da Avaliação</Label>
                      <input
                        id="title"
                        type="text"
                        value={newReview.title}
                        onChange={(e) => setNewReview(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Resuma sua experiência"
                        className="w-full mt-1 p-2 border rounded-md"
                      />
                    </div>

                    <div>
                      <Label htmlFor="comment">Comentário</Label>
                      <Textarea
                        id="comment"
                        value={newReview.comment}
                        onChange={(e) => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
                        placeholder="Descreva sua experiência com este fornecedor..."
                        rows={4}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-base font-medium">Aspectos Específicos</Label>
                      <div className="grid grid-cols-2 gap-4 mt-3">
                        <div>
                          <Label className="text-sm">Comunicação</Label>
                          <div className="flex items-center space-x-2 mt-1">
                            {renderInteractiveStars(newReview.aspects.communication, (rating) => 
                              setNewReview(prev => ({ 
                                ...prev, 
                                aspects: { ...prev.aspects, communication: rating }
                              }))
                            )}
                          </div>
                        </div>

                        <div>
                          <Label className="text-sm">Qualidade</Label>
                          <div className="flex items-center space-x-2 mt-1">
                            {renderInteractiveStars(newReview.aspects.quality, (rating) => 
                              setNewReview(prev => ({ 
                                ...prev, 
                                aspects: { ...prev.aspects, quality: rating }
                              }))
                            )}
                          </div>
                        </div>

                        <div>
                          <Label className="text-sm">Prazo</Label>
                          <div className="flex items-center space-x-2 mt-1">
                            {renderInteractiveStars(newReview.aspects.deadline, (rating) => 
                              setNewReview(prev => ({ 
                                ...prev, 
                                aspects: { ...prev.aspects, deadline: rating }
                              }))
                            )}
                          </div>
                        </div>

                        <div>
                          <Label className="text-sm">Custo-Benefício</Label>
                          <div className="flex items-center space-x-2 mt-1">
                            {renderInteractiveStars(newReview.aspects.value, (rating) => 
                              setNewReview(prev => ({ 
                                ...prev, 
                                aspects: { ...prev.aspects, value: rating }
                              }))
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowReviewDialog(false)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={submitReview}
                        disabled={!newReview.rating || !newReview.comment}
                      >
                        Enviar Avaliação
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Rating Summary */}
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-4xl font-bold text-yellow-600 mb-2">
                  {averageRating.toFixed(1)}
                </div>
                <div className="flex justify-center mb-2">
                  {renderStars(averageRating, 'lg')}
                </div>
                <div className="text-gray-600">
                  Baseado em {totalReviews} avaliações
                </div>
              </div>

              {/* Rating Breakdown */}
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((star) => (
                  <div key={star} className="flex items-center space-x-2">
                    <span className="text-sm w-8">{star}</span>
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <Progress 
                      value={totalReviews > 0 ? (ratingBreakdown[star as keyof typeof ratingBreakdown] / totalReviews) * 100 : 0} 
                      className="flex-1 h-2" 
                    />
                    <span className="text-sm text-gray-500 w-8">
                      {ratingBreakdown[star as keyof typeof ratingBreakdown]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Aspects Average */}
            <div className="space-y-4">
              <h4 className="font-medium">Aspectos Avaliados</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Comunicação</span>
                  <div className="flex items-center space-x-2">
                    <div className="flex">
                      {renderStars(aspectsAverage.communication, 'sm')}
                    </div>
                    <span className="text-sm text-gray-500">
                      {aspectsAverage.communication.toFixed(1)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm">Qualidade</span>
                  <div className="flex items-center space-x-2">
                    <div className="flex">
                      {renderStars(aspectsAverage.quality, 'sm')}
                    </div>
                    <span className="text-sm text-gray-500">
                      {aspectsAverage.quality.toFixed(1)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm">Prazo</span>
                  <div className="flex items-center space-x-2">
                    <div className="flex">
                      {renderStars(aspectsAverage.deadline, 'sm')}
                    </div>
                    <span className="text-sm text-gray-500">
                      {aspectsAverage.deadline.toFixed(1)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm">Custo-Benefício</span>
                  <div className="flex items-center space-x-2">
                    <div className="flex">
                      {renderStars(aspectsAverage.value, 'sm')}
                    </div>
                    <span className="text-sm text-gray-500">
                      {aspectsAverage.value.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters and Sort */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium">Filtrar por:</span>
            <div className="flex space-x-1">
              <Button
                variant={filterRating === null ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterRating(null)}
              >
                Todas
              </Button>
              {[5, 4, 3, 2, 1].map((rating) => (
                <Button
                  key={rating}
                  variant={filterRating === rating ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterRating(rating)}
                >
                  {rating}★
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <SortDesc className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium">Ordenar por:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-sm border rounded px-2 py-1"
          >
            <option value="recent">Mais Recentes</option>
            <option value="helpful">Mais Úteis</option>
            <option value="rating">Maior Nota</option>
          </select>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {sortedReviews.length > 0 ? (
          sortedReviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Review Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          <User className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{review.clientName}</span>
                          {review.verified && (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Verificado
                            </Badge>
                          )}
                        </div>
                        {review.clientCompany && (
                          <div className="flex items-center space-x-1 text-sm text-gray-500">
                            <Building className="h-3 w-3" />
                            <span>{review.clientCompany}</span>
                          </div>
                        )}
                        <div className="flex items-center space-x-2 mt-1">
                          <div className="flex">
                            {renderStars(review.rating, 'sm')}
                          </div>
                          <span className="text-sm text-gray-500">
                            {formatDate(review.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {review.projectValue && (
                        <Badge variant="outline" className="text-xs">
                          R$ {review.projectValue.toLocaleString('pt-BR')}
                        </Badge>
                      )}
                      {review.projectType && (
                        <Badge variant="outline" className="text-xs">
                          {review.projectType}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Review Content */}
                  <div>
                    <h4 className="font-medium mb-2">{review.title}</h4>
                    <p className="text-gray-700">{review.comment}</p>
                  </div>

                  {/* Aspects */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-3 border-t border-b">
                    <div className="text-center">
                      <div className="text-xs text-gray-500 mb-1">Comunicação</div>
                      <div className="flex justify-center">
                        {renderStars(review.aspects.communication, 'sm')}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500 mb-1">Qualidade</div>
                      <div className="flex justify-center">
                        {renderStars(review.aspects.quality, 'sm')}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500 mb-1">Prazo</div>
                      <div className="flex justify-center">
                        {renderStars(review.aspects.deadline, 'sm')}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500 mb-1">Custo-Benefício</div>
                      <div className="flex justify-center">
                        {renderStars(review.aspects.value, 'sm')}
                      </div>
                    </div>
                  </div>

                  {/* Supplier Response */}
                  {review.response && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <Award className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-600">
                          Resposta do Fornecedor
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDate(review.response.respondedAt)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{review.response.content}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => markHelpful(review.id, true)}
                        className="flex items-center space-x-1 text-sm text-gray-500 hover:text-green-600"
                      >
                        <ThumbsUp className="h-4 w-4" />
                        <span>Útil ({review.helpful})</span>
                      </button>
                      <button
                        onClick={() => markHelpful(review.id, false)}
                        className="flex items-center space-x-1 text-sm text-gray-500 hover:text-red-600"
                      >
                        <ThumbsDown className="h-4 w-4" />
                        <span>Não útil ({review.notHelpful})</span>
                      </button>
                    </div>
                    
                    <button
                      onClick={() => reportReview(review.id, 'inappropriate')}
                      className="flex items-center space-x-1 text-sm text-gray-500 hover:text-red-600"
                    >
                      <Flag className="h-4 w-4" />
                      <span>Reportar</span>
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-12">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhuma avaliação encontrada
            </h3>
            <p className="text-gray-500">
              {filterRating 
                ? `Não há avaliações com ${filterRating} estrelas`
                : 'Este fornecedor ainda não possui avaliações'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  )
}