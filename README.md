# Edward Clark — Portfolio Site

## Live URL
https://www.edwardclark.shop

## Project Location
`/home/Server-007/mysite/`

## What's Here
- `public/index.html` — Portfolio page
- `public/resume.pdf` — Downloadable resume
- `public/sitemap.xml` — For Google indexing
- `server.js` — Local dev server (not needed, site is on Netlify)
- `netlify.toml` — Netlify config

## DNS (Netlify Managed)
Nameservers set at Namecheap for `edwardclark.shop`:
- dns1.p03.nsone.net
- dns2.p03.nsone.net
- dns3.p03.nsone.net
- dns4.p03.nsone.net

Current DNS records in Netlify:
- NETLIFY edwardclark.shop → ephemeral-conkies-8ca557.netlify.app
- NETLIFY www.edwardclark.shop → ephemeral-conkies-8ca557.netlify.app
- TXT edwardclark.shop → google-site-verification=v_oyVJBtizE_ArBNJEAgBtyHueQzv6AMVdIK5-Y6jco

## Netlify
- Site name: ephemeral-conkies-8ca557
- Site ID: 5f0ae365-5a87-42d5-bf3e-7abd1bb1578d
- DNS zone ID: 6a3f20205962289915b8c386
- Team: le758703's team (slug: le758703)
- Login: netlify login

## Deploy
```bash
cd /home/Server-007/mysite && netlify deploy --prod --dir=public
```

## To Set Up Email (Free, permanent)
1. Go to https://improvmx.com and sign up with your Gmail
2. Add domain `edwardclark.shop`
3. It will give you MX records like `mx1.improvmx.com` and `mx2.improvmx.com`
4. Add them to Netlify DNS:
```bash
netlify api createDnsRecord -d '{"zone_id": "6a3f20205962289915b8c386", "body": {"type": "MX", "hostname": "edwardclark.shop", "value": "mx1.improvmx.com", "priority": 10, "ttl": 3600}}'
netlify api createDnsRecord -d '{"zone_id": "6a3f20205962289915b8c386", "body": {"type": "MX", "hostname": "edwardclark.shop", "value": "mx2.improvmx.com", "priority": 10, "ttl": 3600}}'
```

## Google Search Console
- Property: https://www.edwardclark.shop (URL prefix)
- Verified via HTML meta tag
- Sitemap: sitemap.xml
- URL: https://search.google.com/search-console

## To Edit the Page
Edit `public/index.html`, then redeploy:
```bash
netlify deploy --prod --dir=public
```
