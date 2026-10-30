import { Link } from 'react-router-dom';

const FOOTER_LINKS = {
  Product: ['Point of Sale', 'Inventory', 'Business Analytics', 'AI Intelligence', 'Multi-Branch', 'Financial Reports'],
  Solutions: ['Retail', 'Wholesale', 'Supermarkets', 'Pharmacies', 'Restaurants', 'Salons', 'Service Businesses'],
  Resources: ['Getting Started', 'Help Centre', 'Guides', 'Blog', 'FAQs'],
  Company: ['About', 'Contact'],
  Legal: ['Privacy Policy', 'Terms of Service'],
};

export function MarketingFooter() {
  return (
    <footer className="bg-slate-50 border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-8">
          {/* Brand area */}
          <div className="col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center">
                <span className="text-white font-bold text-lg">T</span>
              </div>
              <span className="text-lg font-bold text-slate-900">Tally.io</span>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed max-w-xs">
              Smarter POS, inventory and business intelligence for growing Kenyan businesses.
            </p>
            <p className="text-xs text-slate-400 mt-4">
              Built in Kenya 🇰🇪
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([section, links]) => (
            <div key={section}>
              <p className="text-xs font-semibold text-slate-900 uppercase tracking-wide mb-3">{section}</p>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link}>
                    <Link to="/" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} Tally.io. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <span className="text-xs text-slate-400">support@tally.io</span>
            <span className="text-xs text-slate-400">Kenya</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
