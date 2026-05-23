import { Mail, Phone, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-brand-dark">
      <div className="container mx-auto px-4 py-8">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Office Address */}
          <div className="flex flex-col space-y-2">
            <h3 className="text-lg font-bold flex items-center gap-2 text-brand-blue">
              <MapPin className="w-4 h-4" />
              <span>Mailing Address</span>
            </h3>
            <div className="text-white hover:text-blue-400 transition-all duration-300 leading-tight">
              <p>16107 Kensington Dr. #194,</p>
              <p>Sugar Land, TX 77479</p>
            </div>
          </div>

          {/* Contact Information */}
          <div className="flex flex-col space-y-2">
            <h3 className="text-lg font-bold text-brand-blue">Contact Us</h3>
            <div className="space-y-2">
              <a
                href="mailto:info@lsptax.com"
                className="flex items-center gap-2 text-white hover:text-blue-400 transition-all duration-300"
              >
                <Mail className="w-4 h-4" />
                info@lsptax.com
              </a>
              <a
                href="tel:+18335778291"
                className="flex items-center gap-2 text-white hover:text-blue-400 transition-all duration-300"
              >
                <Phone className="w-4 h-4" />
                +1-833-577-8291
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="flex flex-col space-y-2">
            <h3 className="text-lg font-bold text-brand-blue">Quick Links</h3>
            <div className="flex flex-col space-y-1">
              {/* <NavLink
                to="/portal/dashboard"
                className="text-white hover:text-blue-400 transition-all duration-300 hover:translate-x-2"
              >
                Admin Portal
              </NavLink> */}
              {/* <NavLink
                to="#service"
                className="text-white hover:text-blue-400 transition-all duration-300 hover:translate-x-2"
              >
                Our Services
              </NavLink> */}
              <a
                href="/#about"
                className="text-white hover:text-blue-400 transition-all duration-300 hover:translate-x-2"
              >
                About Us
              </a>
              <Link
                to="/privacy"
                className="text-white hover:text-blue-400 transition-all duration-300 hover:translate-x-2"
              >
                Privacy Policy
              </Link>
              <Link
                to="/terms"
                className="text-white hover:text-blue-400 transition-all duration-300 hover:translate-x-2"
              >
                Terms of Use
              </Link>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-blue-900/30 my-2"></div>

        {/* Copyright Line */}
        <div className="text-center">
          <p className="text-sm text-white">
            © {new Date().getFullYear()} Lone Star Property Tax. All rights
            reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
