'use client'

import { useState } from 'react'
import { safeParseImages } from '@/lib/helpers'
import { useUser, SignInButton } from '@clerk/nextjs'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Star,
  ThumbsUp,
  CheckCircle,
  Loader2,
  MessageSquare,
  Image as ImageIcon,
  X,
} from 'lucide-react'

interface Review {
  id: string
  rating: number
  title: string | null
  comment: string | null
  images: string | null
  isVerified: boolean
  helpfulCount: number
  createdAt: string
  user: {
    name: string | null
    avatar: string | null
  }
}

interface ReviewStats {
  averageRating: number
  totalReviews: number
  distribution: Record<number, number>
  userCanReview?: boolean
  userOrderId?: string | null
  userAlreadyReviewed?: boolean
}

interface ReviewsSectionProps {
  productId: string
  productRating: number
  reviewCount: number
  initialReviews: Review[]
}

async function fetchReviews(productId: string, page: number = 1) {
  const res = await fetch(`/api/reviews?productId=${productId}&page=${page}&limit=10`)
  if (!res.ok) throw new Error('Failed to fetch reviews')
  return res.json()
}

async function submitReview(data: { productId: string; orderId: string | null; rating: number; title: string; comment: string; images: string[] }) {
  const res = await fetch('/api/reviews', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to submit review')
  }
  return res.json()
}

async function markHelpful(reviewId: string) {
  const res = await fetch('/api/reviews/helpful', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reviewId }),
  })
  if (!res.ok) throw new Error('Failed to mark as helpful')
  return res.json()
}

function StarRating({ rating, onRate, size = 'md' }: { 
  rating: number
  onRate?: (rating: number) => void
  size?: 'sm' | 'md' | 'lg'
}) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-8 h-8',
  }

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
            className={`${sizeClasses[size]} ${
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

function ReviewCard({ review, onHelpful }: { review: Review; onHelpful?: () => void }) {
  const images = safeParseImages(review.images)
  
  return (
    <div className="border-b pb-6 last:border-0">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center shrink-0">
          {review.user.avatar ? (
            <img src={review.user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
          ) : (
            <span className="font-medium text-sm">{review.user.name?.[0] || '?'}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-medium">{review.user.name || 'Anonymous'}</span>
            {review.isVerified && (
              <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                <CheckCircle className="w-3 h-3 mr-1" />
                Verified Purchase
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <StarRating rating={review.rating} size="sm" />
            <span className="text-sm text-gray-500">
              {new Date(review.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>
          {review.title && <h4 className="font-medium mb-1">{review.title}</h4>}
          {review.comment && (
            <p className="text-gray-600 dark:text-gray-400 text-sm">{review.comment}</p>
          )}
          {images.length > 0 && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {images.slice(0, 4).map((img: string, idx: number) => (
                <div key={idx} className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
              {images.length > 4 && (
                <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center text-sm text-gray-500">
                  +{images.length - 4}
                </div>
              )}
            </div>
          )}
          <div className="flex items-center gap-4 mt-3">
            <Button variant="ghost" size="sm" onClick={onHelpful} className="text-gray-500">
              <ThumbsUp className="w-4 h-4 mr-1" />
              Helpful ({review.helpfulCount})
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ReviewsSection({ productId, productRating, reviewCount, initialReviews }: ReviewsSectionProps) {
  const { user, isSignedIn } = useUser()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [title, setTitle] = useState('')
  const [comment, setComment] = useState('')
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [newImageUrl, setNewImageUrl] = useState('')
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['reviews', productId],
    queryFn: () => fetchReviews(productId),
    initialData: { reviews: initialReviews, stats: { averageRating: productRating, totalReviews: reviewCount, distribution: {} as Record<number, number> } },
  })

  const submitMutation = useMutation({
    mutationFn: submitReview,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', productId] })
      setDialogOpen(false)
      setRating(0)
      setTitle('')
      setComment('')
      setImageUrls([])
    },
  })

  const reviews = data?.reviews || []
  const stats: ReviewStats = data?.stats || { averageRating: 0, totalReviews: 0, distribution: {} }

  const handleSubmit = () => {
    if (rating === 0) {
      alert('Please select a rating')
      return
    }
    submitMutation.mutate({
      productId,
      orderId: stats.userOrderId || null,
      rating,
      title,
      comment,
      images: imageUrls,
    })
  }

  const addImage = () => {
    if (newImageUrl && imageUrls.length < 5) {
      setImageUrls([...imageUrls, newImageUrl])
      setNewImageUrl('')
    }
  }

  const removeImage = (index: number) => {
    setImageUrls(imageUrls.filter((_, i) => i !== index))
  }

  // Rating distribution
  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: stats.distribution?.[star] || 0,
    percentage: stats.totalReviews > 0 
      ? Math.round(((stats.distribution?.[star] || 0) / stats.totalReviews) * 100) 
      : 0,
  }))

  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      <Card>
        <CardContent className="p-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Overall Rating */}
            <div className="text-center md:text-left">
              <div className="text-5xl font-bold text-gray-900 dark:text-white">
                {stats.averageRating?.toFixed(1) || '0.0'}
              </div>
              <div className="flex justify-center md:justify-start mt-2">
                <StarRating rating={Math.round(stats.averageRating || 0)} />
              </div>
              <p className="text-gray-500 mt-1">
                Based on {stats.totalReviews} review{stats.totalReviews !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Distribution */}
            <div className="space-y-2">
              {distribution.map(({ star, count, percentage }) => (
                <div key={star} className="flex items-center gap-2">
                  <span className="text-sm w-8">{star} ★</span>
                  <Progress value={percentage} className="h-2 flex-1" />
                  <span className="text-sm text-gray-500 w-8">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Write Review Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Customer Reviews</h3>
        {!isSignedIn ? (
          <SignInButton mode="modal">
            <Button variant="outline">
              <MessageSquare className="w-4 h-4 mr-2" />
              Sign in to Review
            </Button>
          </SignInButton>
        ) : stats.userAlreadyReviewed ? (
          <Badge variant="secondary" className="text-sm">
            <CheckCircle className="w-3 h-3 mr-1" />
            You already reviewed this product
          </Badge>
        ) : !stats.userCanReview ? (
          <Badge variant="outline" className="text-sm text-gray-500">
            <MessageSquare className="w-3 h-3 mr-1" />
            Only verified purchasers can review
          </Badge>
        ) : (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <MessageSquare className="w-4 h-4 mr-2" />
                Write a Review
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Write a Review</DialogTitle>
                <DialogDescription>
                  Share your experience with this product
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Star Rating */}
                <div className="space-y-2">
                  <Label>Rating *</Label>
                  <div className="flex gap-1">
                    <StarRating rating={rating} onRate={setRating} size="lg" />
                  </div>
                </div>

                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">Review Title</Label>
                  <Input
                    id="title"
                    placeholder="Summarize your experience"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                {/* Comment */}
                <div className="space-y-2">
                  <Label htmlFor="comment">Your Review</Label>
                  <Textarea
                    id="comment"
                    placeholder="What did you like or dislike about this product?"
                    rows={4}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                </div>

                {/* Images */}
                <div className="space-y-2">
                  <Label>Add Photos (optional)</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Image URL"
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={addImage}
                      disabled={imageUrls.length >= 5}
                    >
                      <ImageIcon className="w-4 h-4" />
                    </Button>
                  </div>
                  {imageUrls.length > 0 && (
                    <div className="flex gap-2 flex-wrap mt-2">
                      {imageUrls.map((url, idx) => (
                        <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                          <img src={url} alt="" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeImage(idx)}
                            className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-gray-500">Add up to 5 photos</p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmit} 
                  disabled={rating === 0 || submitMutation.isPending}
                >
                  {submitMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Review'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Reviews List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : reviews.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Star className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <h3 className="font-medium mb-1">No reviews yet</h3>
            <p className="text-gray-500">Be the first to review this product!</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-6">
              {reviews.map((review: Review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
