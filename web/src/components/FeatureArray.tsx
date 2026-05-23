import React from "react";
import f1 from "@/assets/icons/f1.svg";
import f2 from "@/assets/icons/f2.svg";
import f3 from "@/assets/icons/f3.svg";
import f4 from "@/assets/icons/f4.svg";

interface FeatureBoxProps {
  label: string;
  logo: string;
  delay: number; // Add delay as a prop
}

const features = [
  {
    label: "Maximized Tax Savings",
    logo: f1,
  },
  {
    label: "Strategic Wealth Growth",
    logo: f2,
  },
  {
    label: "Significant Tax Relief",
    logo: f3,
  },
  {
    label: "Expert Property Tax Reduction",
    logo: f4,
  },
];

const FeatureArray = () => {
  return (
    <div className="flex flex-col md:flex-row md:mx-8 m-4 md:m-0 md:gap-6 justify-center relative -top-14 z-10">
      {features.map((item, index) => (
        <FeatureBox
          key={index}
          label={item.label}
          logo={item.logo}
          delay={index * 100} // Increment delay for each box
        />
      ))}
    </div>
  );
};

const FeatureBox: React.FC<FeatureBoxProps> = ({ label, logo, delay }) => {
  return (
    <div
      className="flex flex-col items-center border rounded-xl p-4 px-6 mt-4 shadow-md bg-white w-full md:w-1/4"
      data-aos="fade-up"
      data-aos-delay={delay} // Apply delay dynamically
    >
      <img src={logo} alt={`${label} - Lone Star Property Tax`} className="w-16 h-16 mb-4" />
      <h2 className="font-semibold text-center text-lg">{label}</h2>
    </div>
  );
};

export default FeatureArray;
