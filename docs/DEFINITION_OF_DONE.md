# Definition of Done

## Design

- [ ] Matches the approved direction
- [ ] Works at 320, 375, 430, 768, 1024, 1440 px
- [ ] No horizontal overflow
- [ ] Text does not collide or clip
- [ ] Images preserve intended focal points

## Code

- [ ] TypeScript strictness preserved
- [ ] No unnecessary `any`
- [ ] No duplicate components
- [ ] No unrelated changes
- [ ] No avoidable client components
- [ ] No console errors
- [ ] Production build succeeds

## UX

- [ ] Navigation works
- [ ] Links and buttons have meaningful labels
- [ ] Forms handle success and failure when present
- [ ] Loading / empty / error states exist where relevant
- [ ] Touch targets are usable

## Accessibility

- [ ] Semantic landmarks
- [ ] Logical heading hierarchy
- [ ] Keyboard accessible
- [ ] Visible focus
- [ ] Form labels
- [ ] Useful alt text
- [ ] Reduced motion respected
- [ ] Contrast checked

## SEO

- [ ] Unique title / description for important routes
- [ ] Canonical URL
- [ ] Open Graph metadata
- [ ] `robots.ts`
- [ ] `sitemap.ts`
- [ ] Structured data only when truthful and relevant

## Security

- [ ] No exposed secrets
- [ ] Inputs validated on the server
- [ ] Authorization checked server-side if protected data exists
- [ ] No unsafe HTML from untrusted content
- [ ] Dependencies reviewed
- [ ] Security headers reviewed for deployment
- [ ] Third-party scripts justified

## Release

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run build`
- [ ] Broken links checked
- [ ] 404 checked
- [ ] Production environment variables checked
- [ ] Analytics / forms tested only after consent and privacy requirements are understood
