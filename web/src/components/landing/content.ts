/**
 * Copy for the public website. Figures, testimonials and contact details come from
 * the previous site; update them here rather than in the section components.
 */

const ADDRESS_LINES = ["16107 Kensington Dr. #194", "Sugar Land, TX 77479"];

export const SITE_CONTACT = {
  phone: "(833) 577-8291",
  phoneHref: "tel:+18335778291",
  email: "info@lsptax.com",
  addressLines: ADDRESS_LINES,
  addressInline: ADDRESS_LINES.join(", "),
};

export const SITE_NAV = [
  { label: "About", href: "/#about" },
  { label: "Why LSPT", href: "/#why" },
  { label: "How it works", href: "/#how" },
  { label: "Services", href: "/#services" },
  { label: "Key dates", href: "/#keydates" },
];

export const SITE_STATS = [
  { figure: "900+", label: "Clients served" },
  { figure: "2,000+", label: "Protests filed" },
  { figure: "50+", label: "Businesses assisted" },
  { figure: "10+ years", label: "Texas experience" },
];

export const WHY_POINTS = [
  {
    key: "experience",
    title: "Experienced representation",
    desc: "A team that works on Texas property taxes every day and knows how local appraisal districts assess value.",
  },
  {
    key: "fee",
    title: "No savings, no fee",
    desc: "You pay a fee only if we reduce your property's value. If we can't lower your bill, there is no cost to you.",
  },
  {
    key: "types",
    title: "Every property type",
    desc: "Homes, rental and commercial real estate, and business personal property, all handled by one team.",
  },
  {
    key: "support",
    title: "Personal support",
    desc: "A real person who explains each step, answers your questions and keeps you updated through the year.",
  },
] as const;

export const ABOUT_POINTS = [
  "Detailed review of your appraisal notice and property records",
  "Evidence built from market data and comparable properties",
  "Representation at informal reviews and ARB hearings",
  "Clear, transparent fee arrangements",
];

export const PROCESS_STEPS = [
  {
    key: "start",
    title: "Get started",
    desc: "Send us your details and property information. We set up your account and file the paperwork that lets us act for you.",
  },
  {
    key: "review",
    title: "We review",
    desc: "We study your appraisal notice, market trends and comparable properties to find where your value is too high.",
  },
  {
    key: "represent",
    title: "We represent you",
    desc: "We file your protest on time and negotiate with the appraisal district, including at your ARB hearing.",
  },
  {
    key: "inform",
    title: "Stay informed",
    desc: "We tell you the result and keep you updated through the tax year. You pay only if we save you money.",
  },
] as const;

export const SERVICES = [
  {
    key: "residential",
    title: "Residential property",
    desc: "Protests for homeowners and owners of rental homes, condos and small residential investments.",
    points: ["Primary homes and rentals", "Homestead value review", "Annual protest each year"],
  },
  {
    key: "commercial",
    title: "Commercial property",
    desc: "Representation for office, retail, industrial, multifamily and other income-producing property.",
    points: ["Income and sales analysis", "Comparable property evidence", "ARB hearing representation"],
  },
  {
    key: "bpp",
    title: "Business personal property",
    desc: "Help with taxable business assets such as equipment, furniture, fixtures and inventory.",
    points: ["Rendition review and filing", "Asset value review", "Deadline tracking"],
  },
] as const;

export const KEY_DATES = [
  {
    date: "January 1",
    desc: "Property is valued in its condition as of January 1 of the tax year. Most exemptions are also set as of this date.",
  },
  {
    date: "January 5–31",
    desc: "Appraisal districts send rendition forms to business owners for their business personal property.",
  },
  {
    date: "January 31",
    desc: "Last day to pay property taxes without penalty and interest.",
  },
  {
    date: "April 15",
    desc: "Deadline to file your rendition or an extension. Mailed forms must be postmarked on or before this date.",
  },
  {
    date: "May 15",
    desc: "Deadline to file a protest of your appraised value, or 30 days after your notice of appraised value was mailed, whichever is later.",
  },
];

export const TESTIMONIALS = [
  {
    quote:
      "Could not be happier with Hussain and Lone Star Property Tax. From the first consultation to the end, Hussain was clear in laying out expectations and finding a solution to our property tax issues.",
    name: "Armand J",
  },
  {
    quote:
      "I highly recommend Lone Star Property Tax LLC. Hussain Ali is incredibly knowledgeable and saved me a lot of money by protesting my property taxes. Thanks to Hussain Ali, I was able to reduce my taxes significantly.",
    name: "Ali Pourmemar",
  },
  {
    quote:
      "Signed up for the 2021 tax year. They helped me get my home well below what I purchased it for 3 years ago. Would highly recommend them to fight property taxes!!",
    name: "Amin Lalani",
  },
];
