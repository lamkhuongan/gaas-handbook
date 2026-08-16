#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GAAS FOUNDATION Internal Hub — deterministic static site generator.

Compiles the three governed Markdown sources (Brand Guide / Service Matrix /
Sales Handbook) into a single-file dist/index.html with inlined CSS + JS.

Usage:
    python3 build_site.py                 # build dist/index.html
    python3 build_site.py --check         # exit 1 if sources drifted from manifest
    python3 build_site.py --verbose       # print structural counts
"""

import argparse
import hashlib
import io
import json
import re
import shutil
import sys
import unicodedata
from datetime import datetime
from pathlib import Path

HUB = Path(__file__).resolve().parent
ROOT = HUB.parent

BRAND = ROOT / 'brand-guide-gaas.md'
MATRIX = ROOT / 'gaas-service-matrix.md'
HANDBOOK = ROOT / 'gaas-sales-handbook.md'
LOGO_SRC = ROOT / 'Logo GAAS_2026_2.png'

TEMPLATE = HUB / 'src' / 'template.html'
STYLES = HUB / 'src' / 'styles.css'
APP_JS = HUB / 'src' / 'app.js'
REC_DATA = HUB / 'src' / 'gaas-rec-data.js'
NAV_META = HUB / 'src' / 'nav-meta.json'
OVERRIDES = HUB / 'src' / 'authority-overrides.json'

DIST = HUB / 'dist'
OUT_HTML = DIST / 'index.html'
MANIFEST = HUB / 'build-manifest.json'

# Content-integrity invariants derived from the current sources.
BASELINE = {
    'tables': 79,
    'code_fences': 6,
    'checkboxes': 105,
}

APPENDIX_HEADINGS = {'Document Governance', 'Nguyên tắc giá nội bộ'}

TAB_IDS = ['brand', 'matrix', 'handbook']

INTERNAL_SLUGS = {
    'dich-vu-00': 'dich-vu-00', 'ban-do-nhan-dien': 'ban-do-nhan-dien',
    'dich-vu-01': 'dich-vu-01', 'dich-vu-02': 'dich-vu-02',
    'dich-vu-03': 'dich-vu-03', 'dich-vu-04': 'dich-vu-04',
    'dich-vu-05': 'dich-vu-05', 'dich-vu-06': 'dich-vu-06',
    'dich-vu-07': 'dich-vu-07', 'dich-vu-08': 'dich-vu-08',
    'dich-vu-09': 'dich-vu-09', 'dich-vu-10': 'dich-vu-10',
    'dich-vu-11': 'dich-vu-11', 'dich-vu-12': 'dich-vu-12',
    'dich-vu-13': 'dich-vu-13', 'dich-vu-14': 'dich-vu-14',
}

DOC_LINKS = {
    'brand-guide-gaas.md': 'Brand Guide',
    'gaas-service-matrix.md': 'Service Matrix',
    'gaas-sales-handbook.md': 'Sales Handbook',
}

DIAGNOSTIC_INJECT = [
    ('Marketing Accelerator Audit', '9,9M', 'Audit Social, Ads, Brand Health, Zalo OA, Website; báo cáo 25–35 trang; 30-Day Blueprint; presentation 60 phút'),
    ('Zalo Growth Diagnostic', '9,9M', 'Audit OA; đánh giá data/follower; 1 ZNS campaign thử nghiệm; báo cáo; roadmap'),
    ('AI Transformation Workshop', '19,9M', 'Khảo sát hiện trạng; demo 3–5 use case; ưu tiên quy trình; roadmap 90 ngày; Q&A'),
]

# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------

def slugify(text):
    t = unicodedata.normalize('NFD', text)
    t = ''.join(c for c in t if not unicodedata.combining(c))
    t = t.replace('đ', 'd').replace('Đ', 'd')
    t = t.lower()
    t = re.sub(r'[^a-z0-9]+', '-', t)
    t = re.sub(r'-+', '-', t).strip('-')
    return t


def normalize_text(text):
    t = unicodedata.normalize('NFD', text)
    t = ''.join(c for c in t if not unicodedata.combining(c))
    t = t.replace('đ', 'd').replace('Đ', 'd')
    t = t.lower()
    return re.sub(r'\s+', ' ', t).strip()


def sha256_of(path, length=12):
    h = hashlib.sha256()
    with io.open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(65536), b''):
            h.update(chunk)
    return h.hexdigest()[:length]


def esc(text):
    return (str(text)
            .replace('&', '&amp;')
            .replace('<', '&lt;')
            .replace('>', '&gt;')
            .replace('"', '&quot;')
            .replace("'", '&#39;'))


def unique_id(slug, used_ids):
    base = slug or 'section'
    candidate = base
    counter = 2
    while candidate in used_ids:
        candidate = '%s-%d' % (base, counter)
        counter += 1
    used_ids.add(candidate)
    return candidate


# ---------------------------------------------------------------------------
# Markdown block lexer (Pass A)
# ---------------------------------------------------------------------------

class ParseError(Exception):
    pass


def parse_blocks(text, path_label):
    lines = text.split('\n')
    blocks = []
    i = 0
    n = len(lines)

    def err(msg, idx):
        raise ParseError('%s: %s (dòng %d)' % (path_label, msg, idx + 1))

    while i < n:
        line = lines[i]
        stripped = line.strip()
        if not stripped:
            i += 1
            continue
        if stripped == '---':
            blocks.append({'kind': 'hr'})
            i += 1
            continue
        m = re.match(r'^```(\w*)\s*$', stripped)
        if m:
            lang = m.group(1)
            code_lines = []
            i += 1
            while i < n and not lines[i].strip().startswith('```'):
                code_lines.append(lines[i])
                i += 1
            if i >= n:
                err('code fence chưa đóng', i)
            i += 1
            blocks.append({'kind': 'code', 'lang': lang, 'lines': code_lines})
            continue
        m = re.match(r'^(#{1,6})\s+(.*)$', stripped)
        if m:
            level = len(m.group(1))
            title = m.group(2).strip()
            anchor = None
            am = re.match(r'^(.*?)\s*\{#([a-zA-Z0-9-]+)\}\s*$', title)
            if am:
                title = am.group(1).strip()
                anchor = am.group(2)
            blocks.append({'kind': 'heading', 'level': level, 'text': title, 'anchor': anchor})
            i += 1
            continue
        if stripped.startswith('|'):
            rows = []
            while i < n and lines[i].strip().startswith('|'):
                rows.append(lines[i].strip())
                i += 1
            if len(rows) >= 2:
                def split_row(row):
                    return [c.strip() for c in row.strip('|').split('|')]
                header = split_row(rows[0])
                sep = split_row(rows[1])
                if len(sep) == len(header) and all(re.fullmatch(r':?-{2,}:?', c.replace(' ', '')) for c in sep):
                    aligns = []
                    for c in sep:
                        c = c.replace(' ', '')
                        if c.startswith(':') and c.endswith(':'):
                            aligns.append('center')
                        elif c.endswith(':'):
                            aligns.append('right')
                        elif c.startswith(':'):
                            aligns.append('left')
                        else:
                            aligns.append('')
                    data_rows = [split_row(r) for r in rows[2:]]
                    blocks.append({'kind': 'table', 'header': header, 'aligns': aligns, 'rows': data_rows})
                    continue
            blocks.append({'kind': 'para', 'lines': rows})
            continue
        if stripped.startswith('>'):
            quote_lines = []
            while i < n and lines[i].strip().startswith('>'):
                quote_lines.append(lines[i].strip()[1:].strip())
                i += 1
            blocks.append({'kind': 'quote', 'lines': quote_lines})
            continue
        if stripped.startswith('- [ ] '):
            items = []
            while i < n:
                s = lines[i].strip()
                m = re.match(r'^- \[ \]\s+(.*)$', s)
                if not m:
                    if s and s.startswith((' ', '\t')) and items:
                        items[-1]['text'] += ' ' + s.strip()
                        i += 1
                        continue
                    break
                items.append({'marker': 'check', 'text': m.group(1)})
                i += 1
            blocks.append({'kind': 'list', 'items': items})
            continue
        if stripped.startswith('- ⛔ '):
            items = []
            while i < n:
                s = lines[i].strip()
                m = re.match(r'^- ⛔\s+(.*)$', s)
                if not m:
                    break
                items.append({'marker': 'prohibit', 'text': m.group(1)})
                i += 1
            blocks.append({'kind': 'list', 'items': items})
            continue
        m = re.match(r'^-\s+(.*)$', stripped)
        if m:
            items = []
            while i < n:
                s = lines[i].strip()
                m = re.match(r'^-\s+(.*)$', s)
                if not m:
                    if s and s.startswith((' ', '\t')) and items:
                        items[-1]['text'] += ' ' + s.strip()
                        i += 1
                        continue
                    break
                items.append({'marker': 'bullet', 'text': m.group(1)})
                i += 1
            blocks.append({'kind': 'list', 'items': items})
            continue
        m = re.match(r'^\d+\.\s+(.*)$', stripped)
        if m:
            items = []
            while i < n:
                s = lines[i].strip()
                m = re.match(r'^\d+\.\s+(.*)$', s)
                if not m:
                    break
                items.append({'marker': 'ordered', 'text': m.group(1)})
                i += 1
            blocks.append({'kind': 'list', 'items': items})
            continue
        # paragraph
        para = []
        while i < n:
            s = lines[i]
            st = s.strip()
            if not st or st == '---' or st.startswith('```') or st.startswith('|') or st.startswith('>'):
                # stop, do NOT advance i — let the outer loop process this line
                break
            if re.match(r'^#{1,6}\s', st) or re.match(r'^[-*]\s', st) or re.match(r'^\d+\.\s', st):
                break
            para.append(s)
            i += 1
        if not para:
            err('không nhận diện được khối', i)
        blocks.append({'kind': 'para', 'lines': para})

    return blocks


# ---------------------------------------------------------------------------
# Inline renderer (Pass B)
# ---------------------------------------------------------------------------

INLINE_LINK = re.compile(r'\[([^\]]+)\]\(([^)]+)\)')
INLINE_BOLD = re.compile(r'\*\*([^*]+)\*\*')
INLINE_EM = re.compile(r'(?<!\*)\*([^*]+)\*(?!\*)')


def render_link(label, url):
    label = esc(label)
    if url.startswith('#'):
        target = url[1:]
        if target in INTERNAL_SLUGS:
            return '<a href="#handbook/%s">%s</a>' % (INTERNAL_SLUGS[target], label)
        return '<a href="#%s">%s</a>' % (target, label)
    if url in DOC_LINKS:
        return '<span class="doc-ref">%s</span>' % DOC_LINKS[url]
    if url == 'gaas-product-services.md':
        return 'gaas-product-services'
    if url.startswith('http://') or url.startswith('https://'):
        return '<a href="%s" target="_blank" rel="noopener">%s</a>' % (esc(url), label)
    return label


def render_inline_plain(text):
    text = esc(text)
    text = INLINE_LINK.sub(lambda m: render_link(m.group(1), m.group(2)), text)
    text = INLINE_BOLD.sub(lambda m: '<strong>%s</strong>' % m.group(1), text)
    text = INLINE_EM.sub(lambda m: '<em>%s</em>' % m.group(1), text)
    return text


def render_inline(text):
    parts = re.split(r'(`[^`]+`)', text)
    out = []
    for part in parts:
        if len(part) >= 2 and part.startswith('`') and part.endswith('`'):
            inner = part[1:-1]
            if inner.endswith('.md'):
                inner = inner[:-3]
            out.append('<code>%s</code>' % esc(inner))
        else:
            out.append(render_inline_plain(part))
    return ''.join(out)


def plain_inline(text):
    text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)
    text = re.sub(r'`([^`]+)`', r'\1', text)
    text = text.replace('**', '')
    text = re.sub(r'(?<!\*)\*([^*]+)\*(?!\*)', r'\1', text)
    return text


def join_lines(lines):
    html = []
    for idx, line in enumerate(lines):
        hard = re.search(r'[ \t]{2,}$', line)
        line = line.rstrip()
        html.append(render_inline(line))
        if idx < len(lines) - 1:
            html.append('<br>' if hard else ' ')
    return ''.join(html)


def plain_join(lines):
    return ' '.join(plain_inline(l.strip()) for l in lines if l.strip())


SOURCE_TERMS = ('Tham chiếu', 'Nguồn gốc', 'nguồn chuẩn', 'Nguồn:')

def should_hide_line(line):
    """Drop source-file citation lines (anh chỉ muốn nội dung, không phần ghi nguồn)."""
    if '.md' in line:
        return True
    if 'GAAS_Sales_Service_QA_Handbook' in line:
        return True
    if any(line.strip().startswith(t) for t in SOURCE_TERMS):
        return True
    if 'Tham chiếu:' in line.title():
        return True
    return False


# ---------------------------------------------------------------------------
# Component rendering (Pass C)
# ---------------------------------------------------------------------------

QA_RE = re.compile(r'\*\*"(.+)"\*\*\s*→\s*(.+)')
DISC_RE = re.compile(r'\*\*Q:\s*(.+?)\*\*\s*→\s*(.+)')


def render_blockquote(block, first):
    lines = [ln for ln in block['lines'] if not should_hide_line(ln)]
    if not lines:
        return ''
    text = join_lines(lines)
    joined = ' '.join(lines)
    if 'Belief:' in joined:
        return '<div class="belief">' + text + '</div>'
    if 'Lưu ý:' in joined:
        return '<div class="note-warn">' + text + '</div>'
    return '<div class="quote">' + text + '</div>'


def render_list(block, section_slug, checkbox_counter):
    first_marker = block['items'][0]['marker']
    if first_marker == 'check':
        out = ['<ul class="checklist">']
        for idx, item in enumerate(block['items']):
            cid = 'ck-%s-%d' % (section_slug, idx)
            out.append('<li><input type="checkbox" id="%s"><label for="%s">%s</label></li>'
                       % (cid, cid, render_inline(item['text'])))
        out.append('</ul>')
        checkbox_counter[0] += len(block['items'])
        return ''.join(out)
    if first_marker == 'prohibit':
        out = ['<ul class="prohibit">']
        for item in block['items']:
            out.append('<li>⛔ %s</li>' % render_inline(item['text']))
        out.append('</ul>')
        return ''.join(out)
    if first_marker == 'ordered':
        out = ['<ol>']
        for item in block['items']:
            out.append('<li>%s</li>' % render_inline(item['text']))
        out.append('</ol>')
        return ''.join(out)
    kinds = set()
    for item in block['items']:
        t = item['text']
        if QA_RE.match(t):
            kinds.add('qa')
        elif DISC_RE.match(t):
            kinds.add('disc')
        else:
            kinds.add('plain')
    if kinds == {'qa'}:
        out = []
        for item in block['items']:
            m = QA_RE.match(item['text'])
            out.append('<div class="qa-pair"><div class="qa-q">Khách: &ldquo;%s&rdquo;</div><div class="qa-a">%s</div></div>'
                       % (render_inline(m.group(1)), render_inline(m.group(2))))
        return ''.join(out)
    if kinds == {'disc'}:
        out = []
        for item in block['items']:
            m = DISC_RE.match(item['text'])
            out.append('<div class="discovery"><span class="discovery-q">Q: %s</span><span class="discovery-a"> — %s</span></div>'
                       % (render_inline(m.group(1)), render_inline(m.group(2))))
        return ''.join(out)
    out = ['<ul>']
    for item in block['items']:
        out.append('<li>%s</li>' % render_inline(item['text']))
    out.append('</ul>')
    return ''.join(out)


def list_plain(block):
    return ' '.join(plain_inline(it['text']) for it in block['items'])


def render_table(block, caption, badge):
    header = block['header']
    aligns = block['aligns']
    rows = block['rows']
    cols = len(header)
    norm_rows = [row + [''] * (cols - len(row)) for row in rows]
    stackable = cols > 3
    badge_html = ''
    if badge == 'matrix':
        badge_html = '<span class="price-badge matrix">Nguồn giá chính thức</span>'
    elif badge == 'reference':
        badge_html = '<span class="price-badge reference">Theo Matrix</span>'

    out = ['<div class="tbl-wrap"><table class="%s">' % ('stackable' if stackable else '')]
    out.append('<caption>%s%s</caption>' % (esc(caption), badge_html))
    out.append('<thead><tr>')
    for c, h in enumerate(header):
        align = ' align="right"' if aligns[c] == 'right' else ''
        out.append('<th scope="col"%s>%s</th>' % (align, render_inline(h)))
    out.append('</tr></thead><tbody>')
    for row in norm_rows:
        out.append('<tr>')
        for c, cell in enumerate(row):
            align = ' data-align="right"' if aligns[c] == 'right' else ''
            label = ' data-label="%s"' % esc(plain_inline(header[c])) if stackable else ''
            out.append('<td%s%s>%s</td>' % (align, label, render_inline(cell)))
        out.append('</tr>')
    out.append('</tbody></table></div>')
    return ''.join(out)


def table_plain(block):
    parts = block['header'] + [c for row in block['rows'] for c in row]
    return ' '.join(plain_inline(c) for c in parts)


# ---------------------------------------------------------------------------
# Authority overrides (apply to handbook price tables)
# ---------------------------------------------------------------------------

def apply_overrides(table_html, overrides, section_slug):
    applicable = [o for o in overrides if o['handbook_section'] == section_slug]
    if not applicable:
        return table_html, True
    for o in applicable:
        row_label = o['row_label']
        old = o['old_text']
        verdict = o['verdict']
        # Match the row whose first cell contains the row label, then strike the old price.
        row_pat = re.compile(
            r'(<tr>.*?<td[^>]*>[^<]*%s[^<]*</td>)(.*?)(</tr>)' % re.escape(esc(row_label)),
            re.DOTALL)
        new_rows = []

        def repl(m):
            row_inner = m.group(2)
            if old not in row_inner:
                raise ParseError('Override %d (%s) không tìm thấy giá "%s" trong section %s'
                                 % (o['id'], row_label, old, section_slug))
            row_inner = row_inner.replace(
                old,
                '<s>%s</s> <span class="src-fix">%s</span>' % (old, verdict))
            return m.group(1) + row_inner + m.group(3)

        new_html = row_pat.sub(repl, table_html)
        table_html = new_html
    return table_html, True


# ---------------------------------------------------------------------------
# Source metadata
# ---------------------------------------------------------------------------

VERSION_PATTERNS = {
    'brand': [r'Version\s*([0-9.]+)'],
    'matrix': [r'Phiên bản:\s*([0-9.]+)'],
    'handbook': [r'Bản chốt:\s*([0-9/]+)'],
}


def source_meta(path, tab_id):
    st = path.stat()
    data = path.read_text(encoding='utf-8')
    version = '—'
    for pattern in VERSION_PATTERNS.get(tab_id, []):
        m = re.search(pattern, data, re.IGNORECASE)
        if m:
            version = m.group(1).strip()
            break
    return {
        'id': tab_id,
        'file': path.name,
        'size': st.st_size,
        'lines': data.count('\n') + 1,
        'mtime': st.st_mtime,
        'date': datetime.fromtimestamp(st.st_mtime).strftime('%d/%m/%Y %H:%M'),
        'hash': sha256_of(path),
        'version': version,
    }


# ---------------------------------------------------------------------------
# Document renderer
# ---------------------------------------------------------------------------

def render_document(tab_id, tab_label, blocks, overrides, used_ids, checkbox_counter, stats):
    out = []
    groups = []
    index = []
    cur_group = None
    used_ids_global = used_ids

    leaf_slug = None
    leaf_title = None
    leaf_trail = None
    leaf_body = []
    leaf_open = False
    section_open = False
    cur_h2_slug = None
    cur_h2_title = None

    h1_real = 0
    first_quote = True
    doc_title = None
    skip_next = False
    skip_until = None  # for MỤC LỤC suppression
    suppress_toc = tab_id == 'handbook'

    def close_leaf():
        nonlocal leaf_open, leaf_slug, leaf_title, leaf_trail, leaf_body
        if leaf_open:
            body = ' '.join(leaf_body)
            index.append({
                'id': leaf_slug,
                'tab': tab_id,
                'title': leaf_title,
                'trail': leaf_trail,
                'body': body,
                'norm': normalize_text(body),
            })
            leaf_body = []
            leaf_open = False

    def close_section():
        """Đóng <section> đang mở — nếu không đóng, các section lồng nhau
        khiến scroll-spy và deep-link tính sai vùng."""
        nonlocal section_open
        if section_open:
            out.append('</section>')
            section_open = False

    def open_group(label, gid):
        nonlocal cur_group
        cur_group = {'group': label, 'id': gid, 'items': []}
        groups.append(cur_group)

    def add_nav(slug, label, level, parent=None):
        if cur_group is None:
            open_group('Tổng quan', 'tong-quan')
        cur_group['items'].append({'id': slug, 'label': label, 'level': level, 'parent': parent})

    def start_leaf(slug, title, trail):
        nonlocal leaf_slug, leaf_title, leaf_trail, leaf_open
        close_leaf()
        leaf_slug = slug
        leaf_title = title
        leaf_trail = trail
        leaf_body = []
        leaf_open = True

    def emit_block_html(html, block_text):
        out.append(html)
        if block_text:
            leaf_body.append(block_text)

    for idx, block in enumerate(blocks):
        kind = block['kind']

        if skip_next:
            skip_next = False
            continue

        if kind == 'heading':
            level = block['level']
            title = block['text']
            if suppress_toc and level == 2 and title == 'MỤC LỤC':
                skip_until = 'toc-list'
                continue

            slug = block['anchor'] or slugify(title)
            if level == 3 and cur_h2_slug:
                slug = '%s--%s' % (cur_h2_slug, slug)
            slug = unique_id(slug, used_ids_global)

            if level == 1:
                if h1_real == 0 and doc_title is None:
                    doc_title = title
                    h1_real = 1
                    continue
                close_leaf()
                close_section()
                open_group(title, slug)
                out.append('<h1 id="%s">%s</h1>' % (slug, render_inline(title)))
                # H1 may be followed by content directly (no H2). Start a default leaf.
                start_leaf(slug, title, tab_label + ' › ' + title)
                continue

            if level == 2:
                close_leaf()
                close_section()
                if title == 'Document Governance':
                    # bỏ toàn bộ phần này theo yêu cầu
                    skip_until = 'governance'
                    continue
                if title in APPENDIX_HEADINGS:
                    open_group('Phụ lục', 'phu-luc')
                elif suppress_toc:
                    open_group(title, slug)
                else:
                    if cur_group is None:
                        open_group('Tổng quan', 'tong-quan')
                cur_h2_slug = slug
                cur_h2_title = title
                out.append('<section id="%s"><h2>%s</h2>' % (slug, render_inline(title)))
                section_open = True
                add_nav(slug, title, 2)
                start_leaf(slug, title, tab_label + ' › ' + title)
                continue

            if level == 3:
                close_leaf()
                out.append('<h3 id="%s">%s</h3>' % (slug, render_inline(title)))
                add_nav(slug, title, 3, parent=cur_h2_slug)
                trail = tab_label + ' › ' + (cur_h2_title or '') + ' › ' + title
                start_leaf(slug, title, trail)
                continue
            continue

        if skip_until == 'governance':
            # skip everything until the end (Document Governance is the last section)
            continue
        if skip_until == 'toc-list':
            # Skip the TOC list body
            if kind == 'list':
                skip_until = None
                continue
            continue

        # Blocks outside any leaf (pre-H2 header area)
        if not leaf_open:
            if kind == 'quote':
                out.append(render_blockquote(block, first_quote))
                first_quote = False
                continue
            if kind == 'hr':
                continue
            if kind == 'code':
                joined = '\n'.join(block['lines'])
                stats['code_fences'] += 1
                out.append('<pre class="ascii-flow">%s</pre>' % esc(joined))
                continue
            if kind == 'list':
                out.append(render_list(block, 'tong-quan', checkbox_counter))
                continue
            out.append('<p>%s</p>' % join_lines(block['lines']))
            continue

        caption = leaf_title or tab_label
        badge = None
        if tab_id == 'matrix' and kind == 'table' and any(a == 'right' for a in block['aligns']):
            badge = 'matrix'
        elif tab_id == 'handbook' and kind == 'table' and cur_h2_title and 'Giá định hướng' in (leaf_title or ''):
            badge = 'reference'

        if kind == 'hr':
            out.append('<hr class="sec-rule">')
            continue
        if kind == 'quote':
            # Pitch pattern: preceding para handled separately
            html = render_blockquote(block, first_quote)
            first_quote = False
            emit_block_html(html, plain_join(block['lines']))
        elif kind == 'code':
            joined = '\n'.join(block['lines'])
            stats['code_fences'] += 1
            if '→' in joined or '↓' in joined:
                html = '<pre class="ascii-flow">%s</pre>' % esc(joined)
            else:
                html = '<pre class="code-block">%s</pre>' % esc(joined)
            emit_block_html(html, plain_inline(joined))
        elif kind == 'list':
            html = render_list(block, leaf_slug, checkbox_counter)
            emit_block_html(html, list_plain(block))
        elif kind == 'table':
            stats['tables'] += 1
            html = render_table(block, caption, badge)
            if badge == 'reference':
                html, _ = apply_overrides(html, overrides, cur_h2_slug or leaf_slug)
            emit_block_html(html, table_plain(block))
        elif kind == 'para':
            lines = [ln for ln in block['lines'] if not should_hide_line(ln)]
            if not lines:
                continue
            joined = ' '.join(lines)
            if 'SALES NÓI TRONG 20 GIÂY' in joined and idx + 1 < len(blocks) and blocks[idx + 1]['kind'] == 'quote':
                next_quote = blocks[idx + 1]
                next_lines = [ln for ln in next_quote['lines'] if not should_hide_line(ln)]
                if not next_lines:
                    continue
                html = ('<div class="pitch"><div class="pitch-title">%s</div><div class="pitch-body">%s</div></div>'
                        % (render_inline(' '.join(lines)), join_lines(next_lines)))
                skip_next = True
                emit_block_html(html, plain_join(lines) + ' ' + plain_join(next_lines))
            else:
                html = '<p>%s</p>' % join_lines(lines)
                emit_block_html(html, plain_join(lines))
        else:
            continue

    close_leaf()
    close_section()
    return ''.join(out), groups, index, doc_title


# ---------------------------------------------------------------------------
# Tab panel assembly
# ---------------------------------------------------------------------------

def build_rec_widget():
    """Widget 'Chọn gói dịch vụ phù hợp' — đứng sau nội dung handbook (sau THÔNG ĐIỆP CUỐI),
    trước panel Phán quyết giá. Form + logic đổ bằng app.js (initRecommendWidget)."""
    return (
        '<section id="rec-widget" aria-label="Chọn gói dịch vụ phù hợp">'
        '<h2>Chọn gói dịch vụ phù hợp</h2>'
        '<p class="rec-sub">Điền nhu cầu của khách → nhận đề xuất dịch vụ + gói phù hợp '
        '(giá định hướng theo Service Matrix, giá chính thức cần brief).</p>'
        '<form id="recForm" class="rec-form" novalidate></form>'
        '<div id="recResults" class="rec-results" hidden></div>'
        '</section>'
    )


def build_panel(tab, content, groups, doc_title, sources, overrides):
    accent = tab.get('accent', 'navy')
    panel_id = 'tab-%s' % tab['id']
    sub = {
        'brand': 'Hệ thống chiến lược thương hiệu · Single Source of Truth',
        'matrix': 'Cấu trúc gói, deliverable và giá · Nguồn giá chính thức',
        'handbook': 'Chẩn đoán, tư vấn, brief và xử lý kỳ vọng cho Sales',
    }.get(tab['id'], '')
    title = tab.get('title', doc_title or tab['label'])
    html = ('<div class="tab-panel%s" id="%s" role="tabpanel" aria-labelledby="tabbtn-%s" tabindex="0">'
            '<h1 class="tab-title">%s</h1><p class="tab-sub">%s</p>'
            '<div class="content">%s</div></div>'
            % (' accent-' + accent if accent else '', panel_id, tab['id'],
               esc(title), esc(sub), content))
    return html


# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------

def build(verbose=False):
    nav_meta = json.loads(NAV_META.read_text(encoding='utf-8'))
    overrides = json.loads(OVERRIDES.read_text(encoding='utf-8'))['items']
    template = TEMPLATE.read_text(encoding='utf-8')
    css = STYLES.read_text(encoding='utf-8')
    js = APP_JS.read_text(encoding='utf-8')
    rec_data = REC_DATA.read_text(encoding='utf-8')

    sources = {
        'brand': source_meta(BRAND, 'brand'),
        'matrix': source_meta(MATRIX, 'matrix'),
        'handbook': source_meta(HANDBOOK, 'handbook'),
    }
    max_mtime = max(m['mtime'] for m in sources.values())
    newest_id = max(sources.items(), key=lambda kv: kv[1]['mtime'])[0]
    for tab_id, meta in sources.items():
        meta['isNewest'] = (tab_id == newest_id)
    build_stamp = datetime.fromtimestamp(max_mtime).strftime('%d/%m/%Y %H:%M')
    sources['build'] = {
        'stamp': build_stamp,
        'generated': datetime.fromtimestamp(max_mtime).strftime('%Y-%m-%d %H:%M:%S'),
    }

    used_ids = set()
    checkbox_counter = [0]
    stats = {'tables': 0, 'code_fences': 0}
    panels = []
    nav_map = {}
    index = []
    doc_titles = {}

    for tab in nav_meta['tabs']:
        tab_id = tab['id']
        src_file = {'brand': BRAND, 'matrix': MATRIX, 'handbook': HANDBOOK}[tab_id]
        text = src_file.read_text(encoding='utf-8')
        blocks = parse_blocks(text, src_file.name)
        content, groups, records, doc_title = render_document(
            tab_id, tab['label'], blocks, overrides, used_ids, checkbox_counter, stats)
        if tab_id == 'handbook':
            content = content + build_rec_widget()
        panels.append(build_panel(tab, content, groups, doc_title, sources, overrides))
        nav_map[tab_id] = groups
        index.extend(records)
        doc_titles[tab_id] = doc_title

    tabs_html = ''
    for tab in nav_meta['tabs']:
        tabs_html += ('<button class="nav-tab" id="tabbtn-%s" role="tab" data-tab="%s" '
                      'aria-selected="%s" aria-controls="tab-%s">'
                      '<span class="tab-long">%s</span><span class="tab-short">%s</span></button>'
                      % (tab['id'], tab['id'], 'true' if tab['id'] == 'brand' else 'false',
                         tab['id'], esc(tab['label']), esc(tab.get('short', tab['label']))))

    # Strip source-file metadata from page-embedded data (không hiện .md trên site).
    tabs_page = [{'id': t['id'], 'label': t['label'], 'short': t.get('short', t['label']),
                  'accent': t.get('accent', 'navy'), 'title': t.get('title', '')}
                 for t in nav_meta['tabs']]
    sources_page = {k: {kk: vv for kk, vv in v.items() if kk not in ('file', 'path')}
                    for k, v in sources.items()}

    data = ('<script>window.__GAAS_TABS=%s;window.__GAAS_NAV=%s;window.__GAAS_INDEX=%s;window.__GAAS_SOURCES=%s;'
            '</script>'
            % (json.dumps(tabs_page, ensure_ascii=False),
               json.dumps(nav_map, ensure_ascii=False),
               json.dumps(index, ensure_ascii=False),
               json.dumps(sources_page, ensure_ascii=False)))

    html = (template
            .replace('{{CSS}}', '<style>%s</style>' % css)
            .replace('{{TABS}}', tabs_html)
            .replace('{{PANELS}}', '\n'.join(panels))
            .replace('{{REC_DATA}}', '<script>%s</script>' % rec_data)
            .replace('{{DATA}}', data)
            .replace('{{JS}}', js))

    DIST.mkdir(exist_ok=True)
    OUT_HTML.write_text(html, encoding='utf-8')
    shutil.copyfile(HUB / 'assets' / 'logo.png', DIST / 'logo.png')

    manifest = {
        'built_at': sources['build']['generated'],
        'stamp': build_stamp,
        'sources': {k: {'hash': v['hash'], 'mtime': v['mtime'], 'file': v['file']}
                    for k, v in sources.items() if k != 'build'},
        'stats': {'tables': stats['tables'], 'code_fences': stats['code_fences'],
                  'checkboxes': checkbox_counter[0]},
    }
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')

    if verbose:
        print('Tables rendered : %d (baseline %d)' % (stats['tables'], BASELINE['tables']))
        print('Code fences     : %d (baseline %d)' % (stats['code_fences'], BASELINE['code_fences']))
        print('Checkboxes      : %d (baseline %d)' % (checkbox_counter[0], BASELINE['checkboxes']))
        print('Nav groups      : %s' % {k: len(v) for k, v in nav_map.items()})
        print('Index records   : %d' % len(index))
        print('Output          : %s (%d bytes)' % (OUT_HTML, OUT_HTML.stat().st_size))
        print('Build stamp     : %s' % build_stamp)

    # Integrity checks
    problems = []
    if stats['tables'] != BASELINE['tables']:
        problems.append('tables %d != %d' % (stats['tables'], BASELINE['tables']))
    if stats['code_fences'] != BASELINE['code_fences']:
        problems.append('code_fences %d != %d' % (stats['code_fences'], BASELINE['code_fences']))
    if checkbox_counter[0] != BASELINE['checkboxes']:
        problems.append('checkboxes %d != %d' % (checkbox_counter[0], BASELINE['checkboxes']))
    if problems:
        raise SystemExit('BASELINE MISMATCH: ' + '; '.join(problems))

    return html


def check():
    if not MANIFEST.exists():
        print('Chưa có build-manifest.json — chạy build trước.')
        return 1
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    drifted = []
    for tab_id in TAB_IDS:
        path = {'brand': BRAND, 'matrix': MATRIX, 'handbook': HANDBOOK}[tab_id]
        current_hash = sha256_of(path)
        recorded = manifest['sources'].get(tab_id, {}).get('hash')
        if recorded != current_hash:
            drifted.append('%s (%s)' % (path.name, current_hash))
    if drifted:
        print('DRIFT: các nguồn đã thay đổi so với lần build cuối — hãy chạy `python3 build_site.py` để build lại:')
        for d in drifted:
            print('  - ' + d)
        return 1
    print('OK — các nguồn khớp với lần build hiện tại.')
    return 0


def main():
    parser = argparse.ArgumentParser(description='Build GAAS FOUNDATION Internal Hub')
    parser.add_argument('--check', action='store_true', help='Kiểm tra drift nguồn')
    parser.add_argument('--verbose', action='store_true', help='In thống kê cấu trúc')
    args = parser.parse_args()
    if args.check:
        sys.exit(check())
    build(verbose=args.verbose)
    sys.exit(0)


if __name__ == '__main__':
    main()
