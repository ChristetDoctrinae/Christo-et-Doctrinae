/* ================================================================
   Christo et Doctrinae — Live Site-Accurate CMS Previews
   Registers real-site CSS + preview templates so the editor's preview
   pane shows entries the way they will actually render on the live
   site, instead of Netlify CMS's generic field-dump preview.

   API notes: `h` (hyperscript, i.e. React.createElement) and
   `createClass` are globals exposed by netlify-cms.js specifically for
   this no-build-step use case (documented Netlify CMS pattern). This
   script must run AFTER netlify-cms.js has loaded, so it's placed in
   a <script> tag below it in admin/index.html.
   ================================================================ */
(function () {
  'use strict';

  // Load the real site stylesheets + fonts into the preview iframe.
  CMS.registerPreviewStyle('/styles.css');
  CMS.registerPreviewStyle('/assets/css/overrides.css');
  CMS.registerPreviewStyle(
    'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;1,500&family=Libre+Baskerville:ital,wght@0,400;1,400&display=swap'
  );

  /* ---- shared helpers ------------------------------------------- */

  function val(entry, path, fallback) {
    var v = entry.getIn(Array.isArray(path) ? path : ['data', path]);
    if (v === undefined || v === null || v === '') return fallback;
    return v;
  }

  function listVal(entry, name) {
    var v = entry.getIn(['data', name]);
    return v && v.toJS ? v.toJS() : [];
  }

  function assetUrl(widgetFor_getAsset, path) {
    if (!path) return '';
    var asset = widgetFor_getAsset(path);
    return asset ? asset.toString() : '';
  }

  function formatDateLong(d) {
    if (!d) return '';
    var date = new Date(d);
    if (isNaN(date.getTime())) return String(d);
    var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return months[date.getUTCMonth()] + ' ' + date.getUTCDate() + ', ' + date.getUTCFullYear();
  }

  function formatDateMonthYear(d) {
    if (!d) return '';
    var date = new Date(d);
    if (isNaN(date.getTime())) return String(d);
    var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return months[date.getUTCMonth()] + ' ' + date.getUTCFullYear();
  }

  var FOCAL_MAP = {
    center: 'center center', top: 'center top', bottom: 'center bottom',
    left: 'left center', right: 'right center',
    'top-left': 'left top', 'top-right': 'right top',
    'bottom-left': 'left bottom', 'bottom-right': 'right bottom'
  };

  /* ================================================================
     ARTICLES — mirrors _layouts/article.html exactly
     ================================================================ */
  var ArticlePreview = createClass({
    render: function () {
      var entry = this.props.entry;
      var title = val(entry, 'title', 'Untitled Article');
      var subtitle = val(entry, 'subtitle', null);
      var author = val(entry, 'author', null);
      var date = val(entry, 'date', null);
      var series = val(entry, 'series', null);
      var coverImage = val(entry, 'cover_image', null);
      var focalPoint = val(entry, 'focal_point', 'center');
      var tags = listVal(entry, 'tags');
      var coverUrl = coverImage ? assetUrl(this.props.getAsset, coverImage) : '';
      var focalPos = FOCAL_MAP[focalPoint] || 'center center';

      return h('div', {},
        h('header', { className: 'article-header' },
          /* NOTE: .article-cover's real CSS uses `height: 52vh`. Inside the
             preview iframe (which auto-sizes its height to fit content),
             a vh-based height can create a resize feedback loop — the
             iframe grows to fit content, which grows because vh grew, ad
             infinitum, hanging the tab. Pin a fixed px height in preview. */
          coverUrl
            ? h('div', { className: 'article-cover', style: { backgroundImage: 'url(' + coverUrl + ')', backgroundPosition: focalPos, height: '320px' } })
            : h('div', { className: 'article-cover article-cover-placeholder', style: { background: 'linear-gradient(135deg,#14131F,#2A1520,#7A1C2E)', height: '320px' } }),
          h('div', { className: 'article-header-inner' },
            h('div', { className: 'container-narrow' },
              series ? h('span', { className: 'article-series-tag' }, series) : null,
              h('h1', { className: 'article-title' }, title),
              subtitle ? h('p', { className: 'article-subtitle' }, subtitle) : null,
              h('div', { className: 'article-meta-line' },
                author ? h('span', { className: 'article-author' }, author) : null,
                (author && date) ? h('span', { className: 'article-meta-sep' }, ' · ') : null,
                date ? h('time', { className: 'article-date' }, formatDateLong(date)) : null
              ),
              tags.length ? h('div', { className: 'article-tags' },
                tags.map(function (t, i) { return h('span', { className: 'article-tag', key: i }, t); })
              ) : null
            )
          )
        ),
        h('main', { className: 'section' },
          h('div', { className: 'container-narrow' },
            h('div', { className: 'article-body prose' }, this.props.widgetFor('body'))
          )
        )
      );
    }
  });
  CMS.registerPreviewTemplate('articles', ArticlePreview);

  /* ================================================================
     SERIES — matches the series-card look from series.html
     ================================================================ */
  var SeriesPreview = createClass({
    render: function () {
      var entry = this.props.entry;
      var name = val(entry, 'name', 'Untitled Series');
      var isYearly = val(entry, 'is_yearly', false);

      return h('section', { className: 'section section-alt' },
        h('div', { className: 'container' },
          h('div', { className: 'series-grid' },
            h('div', { className: 'series-card' },
              h('div', { className: 'series-number' }, 'I'),
              h('div', {},
                h('h3', {}, name),
                h('p', { className: 'series-count' }, isYearly ? 'Yearly series' : 'Standalone series'),
                h('div', { className: 'prose' }, this.props.widgetFor('description')),
                h('a', { className: 'btn btn-outline btn-sm' }, 'Explore the Series')
              )
            )
          )
        )
      );
    }
  });
  CMS.registerPreviewTemplate('series', SeriesPreview);

  /* ================================================================
     PRINT EDITIONS — matches edition-listing-card + description block
     ================================================================ */
  var EditionPreview = createClass({
    render: function () {
      var entry = this.props.entry;
      var title = val(entry, 'title', 'Untitled Edition');
      var theme = val(entry, 'theme', null);
      var season = val(entry, 'season', null);
      var contents = val(entry, 'contents', null);
      var coverImage = val(entry, 'cover_image', null);
      var coverUrl = coverImage ? assetUrl(this.props.getAsset, coverImage) : '';

      return h('div', {},
        h('header', { className: 'page-header' },
          h('span', { className: 'eyebrow' }, season || 'Print Edition'),
          h('h1', {}, title),
          theme ? h('p', { className: 'lead' }, theme) : null
        ),
        h('section', { className: 'section' },
          h('div', { className: 'container', style: { display: 'flex', gap: '2.5rem', alignItems: 'flex-start', flexWrap: 'wrap' } },
            h('div', { style: { width: '220px', flexShrink: 0 } },
              coverUrl
                ? h('img', { src: coverUrl, style: { width: '100%', display: 'block' } })
                : h('div', { className: 'edition-listing-cover edition-listing-cover-placeholder', style: { height: '300px' } })
            ),
            h('div', { className: 'prose', style: { flex: 1, minWidth: '260px' } },
              contents ? h('p', { style: { color: 'var(--text-muted)', fontStyle: 'italic' } }, contents) : null,
              this.props.widgetFor('description')
            )
          )
        )
      );
    }
  });
  CMS.registerPreviewTemplate('editions', EditionPreview);

  /* ================================================================
     PAGE_CONTENT FILES — registered per file `name`, not collection name
     ================================================================ */

  /* ---- Homepage: also where the hero_title_size bug lived ------- */
  var HomepagePreview = createClass({
    render: function () {
      var entry = this.props.entry;
      var heroSize = val(entry, 'hero_title_size', '');
      var heroHeading = val(entry, 'hero_heading', 'Christo et Doctrinae');
      var recentEyebrow = val(entry, 'recent_eyebrow', 'Latest Writing');
      var recentHeading = val(entry, 'recent_heading', 'From the Journal');
      var recentLead = val(entry, 'recent_lead', 'Essays, meditations, and artistic reflection at the intersection of faith and culture.');
      var aboutPanelText = val(entry, 'about_panel_text', 'PLACEHOLDER ABOUT ON COVER');
      var aboutPanelBtn = val(entry, 'about_panel_btn', 'Learn More');
      var featuredEyebrow = val(entry, 'featured_eyebrow', 'Featured');
      var featuredHeading = val(entry, 'featured_heading', 'From the Editors');
      var featuredLead = val(entry, 'featured_lead', 'Selected writing chosen by the editorial board.');
      var heroStyle = (heroSize && heroSize !== '') ? { fontSize: heroSize } : {};

      /* .hero uses `min-height: 100vh` on the real site. Inside the preview
         iframe (which auto-sizes to fit content) that creates a resize
         feedback loop — height depends on vh, vh depends on the iframe's
         own height, which just grew. Pin a fixed px height for preview. */
      return h('div', {},
        h('section', { className: 'hero', style: { minHeight: '460px' } },
          h('div', { className: 'hero-overlay' }),
          h('div', { className: 'hero-content' },
            h('h1', { style: heroStyle }, heroHeading)
          )
        ),
        h('section', { className: 'section' },
          h('div', { className: 'container' },
            h('div', { className: 'section-header' },
              h('span', { className: 'eyebrow' }, recentEyebrow),
              h('h2', {}, recentHeading),
              h('div', { className: 'section-divider' }),
              h('p', { className: 'lead' }, recentLead)
            ),
            h('p', { style: { textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem' } },
              '(The three most recent published articles appear here on the live site.)')
          )
        ),
        h('section', { className: 'about-overlay-panel', style: { minHeight: '320px' } },
          h('div', { className: 'panel-overlay' }),
          h('div', { className: 'panel-content' },
            h('p', {}, aboutPanelText),
            h('a', { className: 'btn btn-outline-ivory' }, aboutPanelBtn)
          )
        ),
        h('section', { className: 'section section-alt' },
          h('div', { className: 'container' },
            h('div', { className: 'section-header' },
              h('span', { className: 'eyebrow' }, featuredEyebrow),
              h('h2', {}, featuredHeading),
              h('div', { className: 'section-divider' }),
              h('p', { className: 'lead' }, featuredLead)
            )
          )
        )
      );
    }
  });
  CMS.registerPreviewTemplate('homepage', HomepagePreview);

  /* ---- About Page ------------------------------------------------ */
  var AboutPagePreview = createClass({
    render: function () {
      var entry = this.props.entry;
      var heroEyebrow = val(entry, 'hero_eyebrow', 'Who We Are');
      var heroHeading = val(entry, 'hero_heading', 'Christo et Doctrinae');
      var heroLead = val(entry, 'hero_lead', 'ABOUT PAGE TOP TEXT PLACEHOLDER');
      var missionEyebrow = val(entry, 'mission_eyebrow', 'Editorial Statement');
      var missionHeading = val(entry, 'mission_heading', 'Our Mission');
      var teamEyebrow = val(entry, 'team_eyebrow', 'The People Behind the Work');
      var teamHeading = val(entry, 'team_heading', 'Our Team');
      var teamLead = val(entry, 'team_lead', 'Our editors and contributors bring together theology, philosophy, the arts, and letters.');

      /* .page-hero uses `min-height: 55vh` on the real site — pinned to a
         fixed px height in preview for the same reason as .hero above. */
      return h('div', {},
        h('header', { className: 'page-hero', style: { minHeight: '340px' } },
          h('div', { className: 'page-hero-content' },
            h('span', { className: 'eyebrow' }, heroEyebrow),
            h('h1', {}, heroHeading),
            h('p', { className: 'lead' }, heroLead)
          )
        ),
        h('section', { className: 'section' },
          h('div', { className: 'container-narrow prose' },
            h('span', { className: 'eyebrow' }, missionEyebrow),
            h('h2', {}, missionHeading),
            h('div', { className: 'section-divider left' }),
            h('div', { style: { marginTop: '1.5rem', fontSize: '1.05rem' } }, this.props.widgetFor('mission_text'))
          )
        ),
        h('section', { className: 'section section-alt' },
          h('div', { className: 'container' },
            h('div', { className: 'section-header' },
              h('span', { className: 'eyebrow' }, teamEyebrow),
              h('h2', {}, teamHeading),
              h('div', { className: 'section-divider' }),
              h('p', { className: 'lead' }, teamLead)
            ),
            h('p', { style: { textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem' } },
              '(Team member cards are edited separately, under Settings & Content → Team Members.)')
          )
        )
      );
    }
  });
  CMS.registerPreviewTemplate('about_page', AboutPagePreview);

  /* ---- Donate Page ------------------------------------------------ */
  var DonatePagePreview = createClass({
    render: function () {
      var entry = this.props.entry;
      var pageEyebrow = val(entry, 'page_eyebrow', 'Support the Journal');
      var pageHeading = val(entry, 'page_heading', 'Make a Gift');
      var pageLead = val(entry, 'page_lead', 'Your generosity keeps this work alive — in print, online, and in the minds of students who need a place to think.');
      var sectionEyebrow = val(entry, 'section_eyebrow', 'Why It Matters');
      var sectionHeading = val(entry, 'section_heading', 'What Your Gift Supports');
      var donateBtn = val(entry, 'donate_btn', 'Donate Now');

      return h('div', {},
        h('header', { className: 'page-header' },
          h('span', { className: 'eyebrow' }, pageEyebrow),
          h('h1', {}, pageHeading),
          h('p', { className: 'lead' }, pageLead)
        ),
        h('section', { className: 'section' },
          h('div', { className: 'container-narrow prose' },
            h('span', { className: 'eyebrow' }, sectionEyebrow),
            h('h2', {}, sectionHeading),
            h('div', { className: 'section-divider left' }),
            this.props.widgetFor('paragraph_1'),
            this.props.widgetFor('paragraph_2'),
            this.props.widgetFor('paragraph_3'),
            h('div', { style: { marginTop: '3rem', textAlign: 'center' } },
              h('a', { className: 'btn btn-primary' }, donateBtn)
            )
          )
        )
      );
    }
  });
  CMS.registerPreviewTemplate('donate_page', DonatePagePreview);

  /* ---- Series Page (listing intro) -------------------------------- */
  var SeriesPagePreview = createClass({
    render: function () {
      var entry = this.props.entry;
      var pageLead = val(entry, 'page_lead', 'Sustained reflection on questions that do not admit of easy answers.');
      var subtitle = val(entry, 'subtitle', 'What we call a series in Christo et Doctrinae is not a special issue.');

      return h('div', {},
        h('header', { className: 'page-header' },
          h('span', { className: 'eyebrow' }, 'Read Our Work'),
          h('h1', {}, 'Series'),
          h('p', { className: 'lead' }, pageLead)
        ),
        h('div', { className: 'read-subnav' },
          h('div', { className: 'read-subnav-inner' },
            h('span', { className: 'subnav-link' }, 'Articles'),
            h('span', { className: 'subnav-link active' }, 'Series'),
            h('span', { className: 'subnav-link' }, 'Print Editions')
          )
        ),
        h('div', { className: 'page-subtitle-bar' },
          h('p', { className: 'page-subtitle', dangerouslySetInnerHTML: { __html: subtitle } })
        )
      );
    }
  });
  CMS.registerPreviewTemplate('series_page', SeriesPagePreview);

  /* ---- Print Editions Page (listing intro) ------------------------ */
  var EditionsPagePreview = createClass({
    render: function () {
      var entry = this.props.entry;
      var pageLead = val(entry, 'page_lead', 'Each spring, a beautifully designed volume — for the shelf, for the desk, for the long read.');
      var subtitle = val(entry, 'subtitle', 'Our print edition is designed by student editors and printed in a limited annual run.');

      return h('div', {},
        h('header', { className: 'page-header' },
          h('span', { className: 'eyebrow' }, 'Read Our Work'),
          h('h1', {}, 'Print Editions'),
          h('p', { className: 'lead' }, pageLead)
        ),
        h('div', { className: 'read-subnav' },
          h('div', { className: 'read-subnav-inner' },
            h('span', { className: 'subnav-link' }, 'Articles'),
            h('span', { className: 'subnav-link' }, 'Series'),
            h('span', { className: 'subnav-link active' }, 'Print Editions')
          )
        ),
        h('div', { className: 'page-subtitle-bar' },
          h('p', { className: 'page-subtitle', dangerouslySetInnerHTML: { __html: subtitle } })
        )
      );
    }
  });
  CMS.registerPreviewTemplate('editions_page', EditionsPagePreview);

  /* ---- Submissions Page -------------------------------------------- */
  var SubmissionsPreview = createClass({
    render: function () {
      var entry = this.props.entry;
      var headerEyebrow = val(entry, 'header_eyebrow', 'Write for the Journal');
      var headerHeading = val(entry, 'header_heading', 'Submissions');
      var headerLead = val(entry, 'header_lead', 'We welcome theological essays, creative writing, poetry, and visual art from students, scholars, and artists.');
      var deadlineText = val(entry, 'deadline_text', null);
      var scholarly = listVal(entry, 'scholarly_guidelines');
      var creative = listVal(entry, 'creative_guidelines');
      var visual = listVal(entry, 'visual_guidelines');
      var eligibility = listVal(entry, 'eligibility_guidelines');

      function guideBox(title, items) {
        return h('div', { className: 'guidelines-box' },
          h('h3', {}, title),
          items.length ? h('ul', {}, items.map(function (it, i) { return h('li', { key: i }, it); })) : null
        );
      }

      return h('div', {},
        h('header', { className: 'page-header' },
          h('span', { className: 'eyebrow' }, headerEyebrow),
          h('h1', {}, headerHeading),
          h('p', { className: 'lead' }, headerLead)
        ),
        h('section', { className: 'section' },
          h('div', { className: 'container-narrow prose' },
            this.props.widgetFor('intro_paragraph_1'),
            this.props.widgetFor('intro_paragraph_2'),
            this.props.widgetFor('intro_paragraph_3'),
            deadlineText ? h('div', { className: 'info-box' }, h('p', {}, h('strong', {}, 'Current Deadlines: '), deadlineText)) : null
          )
        ),
        h('section', { className: 'section section-alt' },
          h('div', { className: 'container' },
            h('div', { className: 'section-header' },
              h('span', { className: 'eyebrow' }, 'Before You Submit'),
              h('h2', {}, 'Submission Guidelines'),
              h('div', { className: 'section-divider' })
            ),
            h('div', { className: 'guidelines-grid' },
              guideBox('Scholarly & Critical Writing', scholarly),
              guideBox('Creative Writing & Poetry', creative),
              guideBox('Visual Art & Photography', visual),
              guideBox('Eligibility & Process', eligibility)
            )
          )
        )
      );
    }
  });
  CMS.registerPreviewTemplate('submissions', SubmissionsPreview);

}());
