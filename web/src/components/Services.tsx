import React from "react";
import s1 from "@/assets/services/s1.svg";

interface ServiceBoxProps {
  logo: string;
  label: string;
  desc: string;
  ctaLink: string;
  delay: number; // Delay prop to stagger animations
}

const services = [
  {
    logo: s1,
    label: "Expertise in Savings",
    desc: "Our team specializes in Texas property tax laws and knows the ins and outs of local tax assessments.",
    ctaLink: "",
  },
  {
    logo: s1,
    label: "Client-Focused Service",
    desc: "We bring our members high-quality commercial investment opportunities that are normally hidden away in country clubs or investment firms.",
    ctaLink: "",
  },
  {
    logo: s1,
    label: "Risk-Free Savings",
    desc: "Our “No Savings, No Fee” policy means you only pay if we reduce your taxes. If we can’t lower your property tax bill, there’s no cost to you.",
    ctaLink: "",
  },
  
];

const Services = () => {
  return (
    <div className="flex flex-col items-center">
      <h2 className="text-4xl font-bold p-4 m-4">Our Core Services</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 m-8 mb-16">
        {services.map((item, index) => (
          <ServiceBox
            key={index}
            logo={item.logo}
            label={item.label}
            desc={item.desc}
            ctaLink={item.ctaLink}
            delay={index * 100} // Adding delay based on index
          />
        ))}
      </div>
    </div>
  );
};

const ServiceBox: React.FC<ServiceBoxProps> = ({
  logo,
  label,
  desc,
  ctaLink,
  delay,
}) => {
  return (
    <div
      className="flex flex-col border w-full sm:w-64 h-auto items-center p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300"
      data-aos="fade-down"
      data-aos-delay={delay} // Stagger animation
    >
      <img src={logo} alt={label} className="w-16 h-16 mb-4" />
      <h2 className="font-semibold text-lg mb-4">{label}</h2>
      <p className="text-center mb-4">{desc}</p>
      <a
        href={ctaLink}
        className="bg-red-400 text-white text-xs rounded-3xl p-2 px-4 mt-auto hover:bg-red-500 transition-colors duration-300"
      >
        Get Started Now
      </a>
    </div>
  );
};

export default Services;
