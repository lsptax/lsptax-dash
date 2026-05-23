import React from "react";
import fs1 from "@/assets/icons/fs1.svg";
import fs2 from "@/assets/icons/fs2.svg";
import fs3 from "@/assets/icons/fs3.svg";
import fs4 from "@/assets/icons/fs4.svg";

interface FeatureEleProps {
  logo: string;
  figure: string;
  label: string;
}

const features = [
  { logo: fs1, figure: "900+", label: "Satisfied Clients" },
  { logo: fs2, figure: "50+", label: "Businesses Assisted " },
  { logo: fs3, figure: "10 years+", label: "Professional Experience" },
  { logo: fs4, figure: "2000+", label: "Protests Filed" },
];

const FeatureStrip = () => {
  return (
    <div className="bg-[#14212A] text-[#E84F5ABF] flex flex-col md:flex-row justify-around py-8 md:py-4">
      {features.map((item, index) => (
        <FeatureEle
          key={index}
          logo={item.logo}
          figure={item.figure}
          label={item.label}
        />
      ))}
    </div>
  );
};

const FeatureEle: React.FC<FeatureEleProps> = ({ logo, figure, label }) => {
  return (
    <div
      className="flex flex-col items-center md:flex-row gap-4 md:gap-8 p-4 text-[#E84F5ABF]"
      data-aos="zoom-in"
    >
      <img
        src={logo}
        alt={label}
        className="w-16 h-16 md:w-20 md:h-20 text-red-500 fill-current "
      />
      <div className="text-center md:text-left">
        <h2 className="text-xl md:text-2xl font-bold">{figure}</h2>
        <h3 className="text-sm md:text-base">{label}</h3>
      </div>
    </div>
  );
};

export default FeatureStrip;
