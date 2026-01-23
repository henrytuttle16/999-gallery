/**
 * Build script for 999 Gallery
 * Reads exhibition markdown files and generates JSON for the site
 */

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { marked } = require('marked');

const CONTENT_DIR = path.join(__dirname, '..', 'content', 'exhibitions');
const OUTPUT_DIR = path.join(__dirname, '..', 'data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'exhibitions.json');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Read all markdown files
function getExhibitions() {
  const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.md'));

  const exhibitions = files.map(filename => {
    const filepath = path.join(CONTENT_DIR, filename);
    const fileContent = fs.readFileSync(filepath, 'utf-8');
    const { data, content } = matter(fileContent);

    // Convert markdown description to HTML
    const descriptionHtml = data.description ? marked(data.description) : '';

    // Format dates
    const dateStart = new Date(data.date_start);
    const dateEnd = new Date(data.date_end);
    const dateFormatted = formatDateRange(dateStart, dateEnd);

    // Create slug from filename
    const slug = filename.replace('.md', '');

    // Map images to the format the site expects
    const artwork = (data.images || []).map(img => ({
      src: img.image,
      title: img.title || 'Untitled',
      artist: img.artist || '',
      medium: img.medium || '',
      year: img.year || '',
      dimensions: img.dimensions || ''
    }));

    return {
      slug,
      title: data.title,
      dateStart: data.date_start,
      dateEnd: data.date_end,
      dates: dateFormatted,
      isCurrent: data.is_current || false,
      featuredImage: data.featured_image,
      description: data.description || '',
      descriptionHtml,
      artists: data.artists || [],
      artwork,
      locationNote: data.location_note || '',
      published: data.published !== false,
      // Extract year for filtering (use UTC to avoid timezone issues)
      year: dateStart.getUTCFullYear()
    };
  });

  // Filter out unpublished and sort by date (newest first)
  return exhibitions
    .filter(e => e.published)
    .sort((a, b) => new Date(b.dateStart) - new Date(a.dateStart));
}

// Format date range nicely (using UTC to avoid timezone issues)
function formatDateRange(start, end) {
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];

  const startMonth = months[start.getUTCMonth()];
  const endMonth = months[end.getUTCMonth()];
  const startDay = start.getUTCDate();
  const endDay = end.getUTCDate();
  const startYear = start.getUTCFullYear();
  const endYear = end.getUTCFullYear();

  if (startYear === endYear) {
    if (startMonth === endMonth) {
      return `${startMonth} ${startDay} — ${endDay}, ${startYear}`;
    }
    return `${startMonth} ${startDay} — ${endMonth} ${endDay}, ${startYear}`;
  }
  return `${startMonth} ${startDay}, ${startYear} — ${endMonth} ${endDay}, ${endYear}`;
}

// Build the JSON
function build() {
  console.log('Building exhibitions data...');

  const exhibitions = getExhibitions();

  // Create the output object
  const output = {
    generated: new Date().toISOString(),
    current: exhibitions.find(e => e.isCurrent) || null,
    exhibitions: exhibitions,
    // Group by year for archive filtering
    years: [...new Set(exhibitions.map(e => e.year))].sort((a, b) => b - a)
  };

  // Write the JSON file
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));

  console.log(`Generated ${OUTPUT_FILE}`);
  console.log(`- ${exhibitions.length} exhibition(s) found`);
  console.log(`- Current exhibition: ${output.current ? output.current.title : 'None'}`);
  console.log(`- Years: ${output.years.join(', ')}`);
}

build();
