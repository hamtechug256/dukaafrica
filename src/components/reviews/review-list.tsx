'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
} from '@/components/ui/dialog'
import { safeParseImages } from '@/lib/helpers'
import { Star, ThumbsUp, CheckCircle, Loader2 } from 'lucide-react'

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

interface ReviewListProps {
  productId: string
  orderId?: string | null
  canReview?: boolean
  alreadyReviewed?: boolean
  reviews: Review[]
  stats: {
    averageRating: number
    totalReviews: number
    distribution: Record<number, number>
    userCanReview?: boolean
    userOrderId?: string | null
    userAlreadyReviewed?: boolean
  }
}

export function ReviewList({ productId, orderId, canReview, alreadyReviewed, reviews, stats }: ReviewListProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [rating, setRating] = useState(5)
  const [title, setTitle] = useState('')
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmitReview = async () => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          orderId: orderId || null,
          rating,
          title,
          comment,
        }),
      })

      if (response.ok) {
        setIsOpen(false)
        // Refresh the page to show new review
        window.location.reload()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to submit review')
      }
    } catch (error) {
      alert('Something went wrong')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMarkHelpful = async (reviewId: string) => {
    await fetch(`/api/reviews/${reviewId}/helpful`, { method: 'POST' })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Customer Reviews</h3>
        {!canReview && !alreadyReviewed && (
          <Badge variant="outline" className="text-sm text-gray-500">Only verified purchasers can review</Badge>
        )}
        {alreadyReviewed && (
          <Badge variant="secondary" className="text-sm">Already reviewed</Badge>
        )}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button disabled={!canReview || alreadyReviewed}>Write a Review</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Write a Review</DialogTitle>
              <DialogDescription>
                Share your experience with this product
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              {/* Rating */}
              <div className="space-y-2">
                <Label>Rating</Label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          star <= rating
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Title (Optional)</Label>
                <Input
                  id="title"
                  placeholder="Summarize your review"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              {/* Comment */}
              <div className="space-y-2">
                <Label htmlFor="comment">Your Review</Label>
                <Textarea
                  id="comment"
                  placeholder="What did you like or dislike?"
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>

              <Button
                className="w-full"
                onClick={handleSubmitReview}
                disabled={isSubmitting || !comment}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Review'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Summary */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-4xl font-bold">{stats.averageRating.toFixed(1)}</p>
                <div className="flex justify-center mt-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 ${
                        i < Math.round(stats.averageRating)
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-sm text-gray-500 mt-1">{stats.totalReviews} reviews</p>
              </div>
              <div className="flex-1 space-y-1">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = stats.distribution[star] || 0
                  const percentage = stats.totalReviews > 0
                    ? (count / stats.totalReviews) * 100
                    : 0
                  return (
                    <div key={star} className="flex items-center gap-2">
                      <span className="text-sm w-3">{star}</span>
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-yellow-400"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-8">{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Star className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No reviews yet. Be the first to review!</p>
            </CardContent>
          </Card>
        ) : (
          reviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                    {review.user.avatar ? (
                      <img
                        src={review.user.avatar}
                        alt={review.user.name ? `${review.user.name}'s avatar` : 'User avatar'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-medium text-gray-600">
                        {review.user.name?.[0] || '?'}
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{review.user.name || 'Anonymous'}</span>
                      {review.isVerified && (
                        <Badge variant="secondary" className="text-xs">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Verified Purchase
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < review.rating
                                ? 'text-yellow-400 fill-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {review.title && (
                      <p className="font-medium mb-1">{review.title}</p>
                    )}

                    {review.comment && (
                      <p className="text-gray-600 dark:text-gray-400">{review.comment}</p>
                    )}

                    {/* Images */}
                    {review.images && (
                      <div className="flex gap-2 mt-3">
                        {safeParseImages(review.images).map((img: string, idx: number) => (
                          <img
                            key={idx}
                            src={img}
                            alt={`Review photo ${idx + 1}`}
                            className="w-16 h-16 rounded object-cover"
                          />
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-4 mt-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMarkHelpful(review.id)}
                      >
                        <ThumbsUp className="w-4 h-4 mr-1" />
                        Helpful ({review.helpfulCount})
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
