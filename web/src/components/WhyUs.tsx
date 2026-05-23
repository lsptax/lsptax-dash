import React from "react";
import s1 from "@/assets/services/s1.svg";

interface WhyUsBoxProps {
  logo: string;
  label: string;
  desc: string;
}

const services = [
  {
    logo: s1,
    label: "Expertise in Savings",
    desc: "Amet minim mollit non deserunt ullamco est sit aliqua dolor do amet sint. Velit officia consequat duis enim velit mollit.",
  },
  {
    logo: s1,
    label: "Client-Focused Service",
    desc: "Amet minim mollit non deserunt ullamco est sit aliqua dolor do amet sint. Velit officia consequat duis enim velit mollit.",
  },
  {
    logo: s1,
    label: "Risk-Free Savings ",
    desc: "Amet minim mollit non deserunt ullamco est sit aliqua dolor do amet sint. Velit officia consequat duis enim velit mollit.",
  },
  {
    logo: s1,
    label: "Expertise in Savings",
    desc: "Amet minim mollit non deserunt ullamco est sit aliqua dolor do amet sint. Velit officia consequat duis enim velit mollit.",
  },
];

const WhyUs = () => {
  return (
    <div id="whyus" className="flex flex-col items-center p-8">
      <h2 className="font-bold text-3xl md:text-4xl mb-4 text-center">
        Why Choose Us?
      </h2>
      <p className="w-full sm:w-2/3 md:w-1/2 lg:w-1/3 text-center mb-8">
        Choose Lone Star Property Tax for expert Texas property tax reduction
        with a “No Savings, No Fee” guarantee. We simplify the process, handle
        all negotiations, and only charge if we save you money—making it easy
        and risk-free to lower your tax bill.
      </p>
      {/* Add a grid layout to control the number of items in a row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {services.map((item, index) => (
          <WhyUsBox
            key={index}
            logo={item.logo}
            label={item.label}
            desc={item.desc}
          />
        ))}
      </div>
    </div>
  );
};

const WhyUsBox: React.FC<WhyUsBoxProps> = ({ logo, label, desc }) => {
  return (
    <div
      className="flex flex-col border w-64 h-full m-8 justify-center items-center rounded-2xl shadow transition-all duration-300 hover:bg-brand-dark hover:text-white group"
      data-aos="flip-right"
    >
      <img
        src={logo}
        alt=""
        className="p-4 pt-8 transition-transform duration-300 hover:scale-110"
      />
      <h2 className="font-semibold text-lg py-4 group-hover:text-red-400">
        {label}
      </h2>
      <p className="text-center text-sm md:text-base p-4">{desc}</p>
    </div>
  );
};
export default WhyUs;
