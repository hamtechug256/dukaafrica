'use client'

// Force dynamic rendering to avoid Clerk prerender issues
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Star,
  Trash2,
  Edit,
  Loader2,
  Package,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'
import Link from 'next/link'
import { useUser } from '@clerk/nextjs'

interface Review {
  id: string
  rating: number
  title: string | null
  comment: string | null
  images: string | null
  isVerified: boolean
  createdAt: string
  product: {
    id: string
    name: string
    slug: string
    images: string | null
  }
}

async function fetchUserReviews() {
  const res = await fetch('/api/user/reviews')
  if (!res.ok) throw new Error('Failed to fetch reviews')
  return res.json()
}

async function updateReview(reviewId: string, data: { rating: number; title: string; comment: string }) {
  const res = await fetch('/api/reviews', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reviewId, ...data }),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to update review')
  }
  return res.json()
}

async function deleteReview(reviewId: string) {
  const res = await fetch(`/api/reviews?id=${reviewId}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('Failed to delete review')
  return res.json()
}

function StarRating({ rating, onRate }: { rating: number; onRate?: (rating: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onRate?.(star)}
          disabled={!onRate}
          className={`${onRate ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform`}
        >
          <Star
            className={`w-5 h-5 ${
              star <= rating
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-gray-300'
            }`}
          />
        </button>
      ))}
    </div>
  )
}

export default function UserReviewsPage() {
  const { isSignedIn } = useUser()
  const queryClient = useQueryClient()
  const [editDialog, setEditDialog] = useState<{ open: boolean; review: Review | null }>({
    open: false,
    review: null,
  })
  const [editRating, setEditRating] = useState(0)
  const [editTitle, setEditTitle] = useState('')
  const [editComment, setEditComment] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['user-reviews'],
    queryFn: fetchUserReviews,
    enabled: isSignedIn,
  })

  const updateMutation = useMutation({
    mutationFn: (data: { reviewId: string; rating: number; title: string; comment: string }) =>
      updateReview(data.reviewId, { rating: data.rating, title: data.title, comment: data.comment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-reviews'] })
      setEditDialog({ open: false, review: null })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteReview,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-reviews'] })
    },
  })

  const reviews = data?.reviews || []

  const handleEdit = (review: Review) => {
    setEditDialog({ open: true, review })
    setEditRating(review.rating)
    setEditTitle(review.title || '')
    setEditComment(review.comment || '')
  }

  const handleUpdate = () => {
    if (editDialog.review) {
      updateMutation.mutate({
        reviewId: editDialog.review.id,
        rating: editRating,
        title: editTitle,
        comment: editComment,
      })
    }
  }

  const handleDelete = (reviewId: string) => {
    if (confirm('Are you sure you want to delete this review?')) {
      deleteMutation.mutate(reviewId)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Star className="w-6 h-6" />
            My Reviews
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your product reviews
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Reviews</p>
                  <p className="text-2xl font-bold">{reviews.length}</p>
                </div>
                <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                  <Star className="w-5 h-5 text-yellow-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Verified Reviews</p>
                  <p className="text-2xl font-bold text-green-600">
                    {reviews.filter((r: Review) => r.isVerified).length}
                  </p>
                </div>
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Reviews List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : reviews.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Star className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <h3 className="font-medium mb-1">No reviews yet</h3>
              <p className="text-gray-500 mb-4">
                You haven't written any reviews. Purchase products and share your experience!
              </p>
              <Link href="/products">
                <Button>Browse Products</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {reviews.map((review: Review) => {
              const images = review.images ? JSON.parse(review.images) : []
              const productImages = review.product.images ? JSON.parse(review.product.images) : []
              
              return (
                <Card key={review.id}>
                  <CardContent className="p-6">
                    <div className="flex gap-4">
                      {/* Product Image */}
                      <Link 
                        href={`/products/${review.product.slug}`}
                        className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden shrink-0"
                      >
                        {productImages[0] ? (
                          <img 
                            src={productImages[0]} 
                            alt={review.product.name} 
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-8 h-8 text-gray-300" />
                          </div>
                        )}
                      </Link>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <Link 
                              href={`/products/${review.product.slug}`}
                              className="font-medium hover:text-primary line-clamp-1"
                            >
                              {review.product.name}
                            </Link>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <StarRating rating={review.rating} />
                              {review.isVerified && (
                                <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Verified Purchase
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Reviewed on {new Date(review.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleEdit(review)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="text-red-500 hover:text-red-600"
                              onClick={() => handleDelete(review.id)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        
                        {review.title && (
                          <h4 className="font-medium mt-2">{review.title}</h4>
                        )}
                        {review.comment && (
                          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                            {review.comment}
                          </p>
                        )}
                        {images.length > 0 && (
                          <div className="flex gap-2 mt-3">
                            {images.slice(0, 4).map((img: string, idx: number) => (
                              <div key={idx} className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                                <img src={img} alt="" className="w-full h-full object-cover" />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ open, review: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Review</DialogTitle>
            <DialogDescription>
              Update your review for {editDialog.review?.product.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Rating</Label>
              <StarRating rating={editRating} onRate={setEditRating} />
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Review title"
              />
            </div>
            <div className="space-y-2">
              <Label>Comment</Label>
              <Textarea
                value={editComment}
                onChange={(e) => setEditComment(e.target.value)}
                placeholder="Your review"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, review: null })}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdate}
              disabled={editRating === 0 || updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
