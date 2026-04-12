'use client'

import { useUser } from '@clerk/nextjs'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useCallback, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { MobileNav, DesktopSidebar, BottomNav } from '@/components/dashboard/mobile-nav'
import { adminNavItems } from '@/lib/admin-nav'
import { useToast } from '@/hooks/use-toast'
import {
  FileText,
  Plus,
  Loader2,
  Edit,
  Trash2,
  Eye,
  Tag,
  FolderOpen,
  Search,
  X,
  Star,
  Wand2,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'

// ─── Types ──────────────────────────────────────────────────────────

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string | null
  content: string
  coverImage: string | null
  status: string
  isFeatured: boolean
  viewCount: number
  readTimeMin: number
  publishedAt: string | null
  createdAt: string
  author: { id: string; name: string | null } | null
  category: { id: string; name: string; slug: string } | null
  tags: { id: string; name: string; slug: string }[]
}

interface BlogCategory {
  id: string
  name: string
  slug: string
  description: string | null
  order: number
  isActive: boolean
  _count: { BlogPost: number }
}

interface BlogTag {
  id: string
  name: string
  slug: string
  _count: { BlogPost: number }
}

interface PostFormData {
  title: string
  slug: string
  content: string
  excerpt: string
  coverImage: string
  categoryId: string
  status: string
  isFeatured: boolean
  metaTitle: string
  metaDesc: string
  keywords: string
  tagIds: string[]
}

const EMPTY_FORM: PostFormData = {
  title: '',
  slug: '',
  content: '',
  excerpt: '',
  coverImage: '',
  categoryId: '',
  status: 'DRAFT',
  isFeatured: false,
  metaTitle: '',
  metaDesc: '',
  keywords: '',
  tagIds: [],
}

// ─── API Functions ──────────────────────────────────────────────────

async function fetchPosts(): Promise<{ posts: BlogPost[]; total: number }> {
  const res = await fetch('/api/admin/blog/posts?limit=100')
  if (!res.ok) throw new Error('Failed to fetch posts')
  return res.json()
}

async function createPost(data: Partial<PostFormData>): Promise<{ post: BlogPost }> {
  const res = await fetch('/api/admin/blog/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Failed') }
  return res.json()
}

async function updatePost(data: Record<string, unknown>): Promise<{ post: BlogPost }> {
  const res = await fetch('/api/admin/blog/posts', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Failed') }
  return res.json()
}

async function deletePost(id: string) {
  const res = await fetch(`/api/admin/blog/posts?id=${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete')
  return res.json()
}

async function fetchCategories(): Promise<{ categories: BlogCategory[] }> {
  const res = await fetch('/api/admin/blog/categories')
  if (!res.ok) throw new Error('Failed')
  return res.json()
}

async function createCategory(data: { name: string; description?: string; order?: number }): Promise<{ category: BlogCategory }> {
  const res = await fetch('/api/admin/blog/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Failed') }
  return res.json()
}

async function updateCategory(data: Record<string, unknown>): Promise<{ category: BlogCategory }> {
  const res = await fetch('/api/admin/blog/categories', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Failed') }
  return res.json()
}

async function deleteCategory(id: string) {
  const res = await fetch(`/api/admin/blog/categories?id=${id}`, { method: 'DELETE' })
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Failed') }
  return res.json()
}

async function fetchTags(): Promise<{ tags: BlogTag[] }> {
  const res = await fetch('/api/admin/blog/tags')
  if (!res.ok) throw new Error('Failed')
  return res.json()
}

async function createTag(data: { name: string }): Promise<{ tag: BlogTag }> {
  const res = await fetch('/api/admin/blog/tags', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Failed') }
  return res.json()
}

async function deleteTag(id: string) {
  const res = await fetch(`/api/admin/blog/tags?id=${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed')
  return res.json()
}

// ─── Helpers ────────────────────────────────────────────────────────

function statusBadge(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    PUBLISHED: { label: 'Published', className: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400' },
    DRAFT: { label: 'Draft', className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
    ARCHIVED: { label: 'Archived', className: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' },
  }
  const info = map[status] || map.DRAFT
  return <Badge className={`${info.className} border-0 text-xs`}>{info.label}</Badge>
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function stripMd(content: string) {
  return content.replace(/#{1,6}\s?/g, '').replace(/\*{1,3}[^*]+\*{1,3}/g, '').replace(/`{1,3}[^`]+`{1,3}/g, '').replace(/!\[[^\]]*\]\([^)]+\)/g, '').replace(/\[[^\]]+\]\([^)]+\)/g, '').replace(/[_~]{1,3}/g, '').replace(/^>\s?/gm, '').replace(/\n+/g, ' ').trim()
}

function autoExcerpt(content: string, max = 160) {
  const stripped = stripMd(content)
  if (stripped.length <= max) return stripped
  return stripped.substring(0, max).replace(/\s+\S*$/, '') + '…'
}

// ─── Main Component ────────────────────────────────────────────────

export default function AdminBlogPage() {
  const { isLoaded } = useUser()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState('posts')
  const [showPostDialog, setShowPostDialog] = useState(false)
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null)
  const [formData, setFormData] = useState<PostFormData>({ ...EMPTY_FORM })
  const [showPreview, setShowPreview] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Category dialog
  const [showCatDialog, setShowCatDialog] = useState(false)
  const [catName, setCatName] = useState('')
  const [catDesc, setCatDesc] = useState('')

  // Tag input
  const [newTagName, setNewTagName] = useState('')

  // ─── Queries ──────────────────────────────────────────────────────
  const { data: postsData, isLoading: postsLoading } = useQuery({ queryKey: ['admin-blog-posts'], queryFn: fetchPosts })
  const { data: catsData } = useQuery({ queryKey: ['admin-blog-categories'], queryFn: fetchCategories })
  const { data: tagsData } = useQuery({ queryKey: ['admin-blog-tags'], queryFn: fetchTags })

  // ─── Mutations ────────────────────────────────────────────────────
  const createPostMut = useMutation({
    mutationFn: createPost,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-blog-posts'] }); closePostDialog(); toast({ title: 'Post created' }) },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })
  const updatePostMut = useMutation({
    mutationFn: updatePost,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-blog-posts'] }); closePostDialog(); toast({ title: 'Post updated' }) },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })
  const deletePostMut = useMutation({
    mutationFn: deletePost,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-blog-posts'] }); toast({ title: 'Post deleted' }) },
    onError: () => toast({ title: 'Error deleting post', variant: 'destructive' }),
  })
  const createCatMut = useMutation({
    mutationFn: createCategory,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-blog-categories'] }); setShowCatDialog(false); setCatName(''); setCatDesc(''); toast({ title: 'Category created' }) },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })
  const updateCatMut = useMutation({
    mutationFn: updateCategory,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-blog-categories'] }); toast({ title: 'Category updated' }) },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })
  const deleteCatMut = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-blog-categories'] }); toast({ title: 'Category deleted' }) },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })
  const createTagMut = useMutation({
    mutationFn: createTag,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-blog-tags'] }); setNewTagName(''); toast({ title: 'Tag created' }) },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })
  const deleteTagMut = useMutation({
    mutationFn: deleteTag,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-blog-tags'] }); toast({ title: 'Tag deleted' }) },
    onError: () => toast({ title: 'Error deleting tag', variant: 'destructive' }),
  })

  // ─── Computed ─────────────────────────────────────────────────────
  const posts = postsData?.posts || []
  const categories = catsData?.categories || []
  const tags = tagsData?.tags || []

  const filteredPosts = useMemo(() => {
    if (!searchQuery.trim()) return posts
    const q = searchQuery.toLowerCase()
    return posts.filter(p => p.title.toLowerCase().includes(q) || (p.excerpt || '').toLowerCase().includes(q))
  }, [posts, searchQuery])

  // ─── Form Helpers ─────────────────────────────────────────────────
  const updateField = useCallback(<K extends keyof PostFormData>(key: K, val: PostFormData[K]) => {
    setFormData(prev => ({ ...prev, [key]: val }))
  }, [])

  const closePostDialog = useCallback(() => {
    setShowPostDialog(false)
    setEditingPost(null)
    setFormData({ ...EMPTY_FORM })
    setShowPreview(false)
  }, [])

  const openCreate = useCallback(() => {
    setEditingPost(null)
    setFormData({ ...EMPTY_FORM })
    setShowPreview(false)
    setShowPostDialog(true)
  }, [])

  const openEdit = useCallback((post: BlogPost) => {
    setEditingPost(post)
    setFormData({
      title: post.title,
      slug: post.slug,
      content: post.content,
      excerpt: post.excerpt || '',
      coverImage: post.coverImage || '',
      categoryId: post.category?.id || '',
      status: post.status,
      isFeatured: post.isFeatured,
      metaTitle: '',
      metaDesc: '',
      keywords: '',
      tagIds: post.tags.map(t => t.id),
    })
    setShowPreview(false)
    setShowPostDialog(true)
  }, [])

  const handleSubmitPost = useCallback(() => {
    if (!formData.title.trim() || !formData.content.trim()) return
    const data = {
      ...formData,
      tagIds: formData.tagIds,
      coverImage: formData.coverImage || undefined,
      categoryId: formData.categoryId || undefined,
    }
    if (editingPost) {
      updatePostMut.mutate({ id: editingPost.id, ...data })
    } else {
      createPostMut.mutate(data)
    }
  }, [formData, editingPost, createPostMut, updatePostMut])

  const isSubmitting = createPostMut.isPending || updatePostMut.isPending

  // ─── Loading ──────────────────────────────────────────────────────
  if (!isLoaded) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
  }

  // ─── Render ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex overflow-x-hidden">
      <DesktopSidebar title="DuukaAfrica" badge="Admin" navItems={adminNavItems} />

      <main className="flex-1 flex flex-col min-h-screen pb-16 md:pb-0">
        <header className="bg-white dark:bg-gray-800 border-b sticky top-0 z-10">
          <div className="px-4 md:px-6 py-4 flex items-center gap-3">
            <MobileNav title="DuukaAfrica" badge="Admin" navItems={adminNavItems} userType="admin" />
            <div className="min-w-0">
              <h2 className="text-lg md:text-xl font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary hidden sm:block" />
                Blog Management
              </h2>
              <p className="text-sm text-gray-500 hidden sm:block">Manage blog posts, categories, and tags</p>
            </div>
          </div>
        </header>

        <div className="p-4 md:p-6 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="posts" className="gap-1.5">
                <FileText className="w-4 h-4" /> Posts <Badge variant="secondary" className="ml-1 text-xs">{posts.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="categories" className="gap-1.5">
                <FolderOpen className="w-4 h-4" /> Categories
              </TabsTrigger>
              <TabsTrigger value="tags" className="gap-1.5">
                <Tag className="w-4 h-4" /> Tags
              </TabsTrigger>
            </TabsList>

            {/* POSTS TAB */}
            <TabsContent value="posts">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input placeholder="Search posts..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
                </div>
                <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> New Post</Button>
              </div>

              {postsLoading ? (
                <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
              ) : filteredPosts.length === 0 ? (
                <Card className="border-0 shadow-sm">
                  <CardContent className="flex flex-col items-center justify-center py-20">
                    <FileText className="w-12 h-12 text-gray-300 mb-4" />
                    <h3 className="text-lg font-semibold mb-1">No posts yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">Create your first blog post</p>
                    <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Create Post</Button>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-0 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[200px]">Title</TableHead>
                          <TableHead className="hidden md:table-cell">Category</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="hidden sm:table-cell">Views</TableHead>
                          <TableHead className="hidden lg:table-cell">Date</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPosts.map((post) => (
                          <TableRow key={post.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {post.isFeatured && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />}
                                <div className="min-w-0">
                                  <p className="font-medium text-sm truncate max-w-[250px]">{post.title}</p>
                                  <p className="text-xs text-muted-foreground truncate max-w-[250px]">/{post.slug}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              {post.category ? <Badge variant="outline" className="text-xs">{post.category.name}</Badge> : '—'}
                            </TableCell>
                            <TableCell>{statusBadge(post.status)}</TableCell>
                            <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{post.viewCount.toLocaleString()}</TableCell>
                            <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{formatDate(post.publishedAt || post.createdAt)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(post)} title="Edit"><Edit className="w-4 h-4" /></Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deletePostMut.mutate(post.id)} disabled={deletePostMut.isPending} title="Delete">
                                  {deletePostMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 text-red-500" />}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              )}
            </TabsContent>

            {/* CATEGORIES TAB */}
            <TabsContent value="categories">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-muted-foreground">{categories.length} categories</h3>
                <Button onClick={() => setShowCatDialog(true)} size="sm"><Plus className="w-4 h-4 mr-1" /> New Category</Button>
              </div>

              {categories.length === 0 ? (
                <Card className="border-0 shadow-sm">
                  <CardContent className="flex flex-col items-center justify-center py-20">
                    <FolderOpen className="w-12 h-12 text-gray-300 mb-4" />
                    <h3 className="text-lg font-semibold mb-1">No categories</h3>
                    <p className="text-sm text-muted-foreground">Create a category to organize posts</p>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-0 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead className="hidden sm:table-cell">Slug</TableHead>
                          <TableHead>Posts</TableHead>
                          <TableHead>Active</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {categories.map((cat) => (
                          <TableRow key={cat.id}>
                            <TableCell className="font-medium">{cat.name}</TableCell>
                            <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{cat.slug}</TableCell>
                            <TableCell><Badge variant="secondary" className="text-xs">{cat._count.BlogPost}</Badge></TableCell>
                            <TableCell>
                              <Switch checked={cat.isActive} onCheckedChange={(v) => updateCatMut.mutate({ id: cat.id, isActive: v })} disabled={updateCatMut.isPending} />
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteCatMut.mutate(cat.id)} disabled={deleteCatMut.isPending}>
                                {deleteCatMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 text-red-500" />}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              )}
            </TabsContent>

            {/* TAGS TAB */}
            <TabsContent value="tags">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                <p className="text-sm text-muted-foreground">{tags.length} tags</p>
                <form onSubmit={(e) => { e.preventDefault(); if (newTagName.trim()) createTagMut.mutate({ name: newTagName.trim() }) }} className="flex gap-2">
                  <Input placeholder="New tag name" value={newTagName} onChange={e => setNewTagName(e.target.value)} className="w-48" />
                  <Button type="submit" size="sm" disabled={createTagMut.isPending || !newTagName.trim()}>
                    {createTagMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  </Button>
                </form>
              </div>

              {tags.length === 0 ? (
                <Card className="border-0 shadow-sm">
                  <CardContent className="flex flex-col items-center justify-center py-20">
                    <Tag className="w-12 h-12 text-gray-300 mb-4" />
                    <h3 className="text-lg font-semibold mb-1">No tags</h3>
                    <p className="text-sm text-muted-foreground">Create tags to help categorize posts</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {tags.map((tag) => (
                    <Card key={tag.id} className="border-0 shadow-sm">
                      <CardContent className="p-4 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-sm">{tag.name}</p>
                          <p className="text-xs text-muted-foreground">{tag._count.BlogPost} post{tag._count.BlogPost !== 1 ? 's' : ''}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => deleteTagMut.mutate(tag.id)} disabled={deleteTagMut.isPending}>
                          {deleteTagMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4 text-red-500" />}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <BottomNav items={adminNavItems} />
      </main>

      {/* ═══ Create / Edit Post Dialog ═══ */}
      <Dialog open={showPostDialog} onOpenChange={(o) => { if (!o) closePostDialog() }}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle className="text-xl flex items-center gap-2">
              {editingPost ? <><Edit className="w-5 h-5" /> Edit Post</> : <><Plus className="w-5 h-5" /> New Post</>}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="post-title">Title <span className="text-red-500">*</span></Label>
              <Input id="post-title" value={formData.title} onChange={e => updateField('title', e.target.value)} placeholder="Article title" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="post-slug">Slug</Label>
              <Input id="post-slug" value={formData.slug} onChange={e => updateField('slug', e.target.value)} placeholder="auto-generated-slug" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={formData.categoryId} onValueChange={v => updateField('categoryId', v)}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={v => updateField('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="PUBLISHED">Published</SelectItem>
                    <SelectItem value="ARCHIVED">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.tagIds.map(tid => {
                  const t = tags.find(x => x.id === tid)
                  return t ? (
                    <Badge key={tid} variant="secondary" className="gap-1 cursor-pointer hover:bg-destructive/10" onClick={() => updateField('tagIds', formData.tagIds.filter(x => x !== tid))}>
                      {t.name} <X className="w-3 h-3" />
                    </Badge>
                  ) : null
                })}
              </div>
              <Select onValueChange={v => { if (!formData.tagIds.includes(v)) updateField('tagIds', [...formData.tagIds, v]) }}>
                <SelectTrigger><SelectValue placeholder="Add tag..." /></SelectTrigger>
                <SelectContent>
                  {tags.filter(t => !formData.tagIds.includes(t.id)).map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="post-cover">Cover Image URL</Label>
              <Input id="post-cover" value={formData.coverImage} onChange={e => updateField('coverImage', e.target.value)} placeholder="https://..." />
              {formData.coverImage && (
                <div className="w-full max-w-sm aspect-video rounded-lg overflow-hidden bg-gray-100">
                  <img src={formData.coverImage} alt="Cover preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="post-excerpt">Excerpt</Label>
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => updateField('excerpt', autoExcerpt(formData.content))}>
                  <Wand2 className="w-3 h-3 mr-1" /> Auto-generate
                </Button>
              </div>
              <Textarea id="post-excerpt" value={formData.excerpt} onChange={e => updateField('excerpt', e.target.value)} placeholder="Brief summary..." rows={3} />
            </div>

            <div className="flex items-center gap-3">
              <Switch checked={formData.isFeatured} onCheckedChange={v => updateField('isFeatured', v)} id="post-featured" />
              <Label htmlFor="post-featured" className="cursor-pointer flex items-center gap-1.5">
                <Star className="w-4 h-4 text-amber-500" /> Featured article
              </Label>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Content <span className="text-red-500">*</span></Label>
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowPreview(!showPreview)}>
                  {showPreview ? <><Edit className="w-3 h-3 mr-1" /> Edit</> : <><Eye className="w-3 h-3 mr-1" /> Preview</>}
                </Button>
              </div>
              {showPreview ? (
                <div className="min-h-[300px] max-h-[500px] overflow-y-auto rounded-lg border p-4 prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown>{formData.content || '*Nothing to preview*'}</ReactMarkdown>
                </div>
              ) : (
                <Textarea value={formData.content} onChange={e => updateField('content', e.target.value)} placeholder="Write your article in Markdown..." rows={16} className="font-mono text-sm" />
              )}
            </div>

            <div className="border-t pt-5 space-y-4">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">SEO</h4>
              <div className="space-y-2">
                <Label htmlFor="post-meta-title">Meta Title</Label>
                <Input id="post-meta-title" value={formData.metaTitle} onChange={e => updateField('metaTitle', e.target.value)} placeholder="Custom meta title (optional)" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="post-meta-desc">Meta Description</Label>
                <Textarea id="post-meta-desc" value={formData.metaDesc} onChange={e => updateField('metaDesc', e.target.value)} placeholder="Custom meta description (optional)" rows={2} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="post-keywords">Keywords</Label>
                <Input id="post-keywords" value={formData.keywords} onChange={e => updateField('keywords', e.target.value)} placeholder="keyword1, keyword2, ..." />
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t bg-gray-50 dark:bg-gray-800/50">
            <Button variant="outline" onClick={closePostDialog}>Cancel</Button>
            <Button onClick={handleSubmitPost} disabled={isSubmitting || !formData.title.trim() || !formData.content.trim()}>
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {editingPost ? 'Update Post' : 'Create Post'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Create Category Dialog ═══ */}
      <Dialog open={showCatDialog} onOpenChange={setShowCatDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Category</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="cat-name">Name <span className="text-red-500">*</span></Label>
              <Input id="cat-name" value={catName} onChange={e => setCatName(e.target.value)} placeholder="Category name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-desc">Description</Label>
              <Textarea id="cat-desc" value={catDesc} onChange={e => setCatDesc(e.target.value)} placeholder="Optional description" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCatDialog(false)}>Cancel</Button>
            <Button onClick={() => { if (catName.trim()) createCatMut.mutate({ name: catName.trim(), description: catDesc.trim() || undefined }) }} disabled={createCatMut.isPending || !catName.trim()}>
              {createCatMut.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
