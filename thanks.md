---
layout: default
permalink: /thanks/
robots: noindex
sitemap: false
title_from: thanks
---
{% assign t = site.data.site.thanks %}{% include end-page.html title=t.title body=t.body email=true %}
