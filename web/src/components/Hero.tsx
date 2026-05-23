import heroImage from "@/assets/hero.svg";
import { ArrowRight } from "lucide-react";
import { useState } from "react";
import ContactDialog from "./ContactDialog";

const Hero = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  return (
    <div
      id="hero"
      className="bg-brand-background md:max-h-[90vh] flex flex-col md:flex-row items-center justify-between relative p-6 md:p-10 lg:p-18 pb-20 md:pb-32 z-1 overflow-hidden"
    >
      {/* /h */}
      {/* Left Section */}
      <div className="w-full md:w-1/2 flex flex-col items-start md:ml-32 mb-8 md:mb-0">
        <div className=" w-full max-w-[90%] md:max-w-full">
          <h4 className="border-l-4 border-blue-400 px-4 text-lg md:text-xl">
            Offering the best tax reduction services
          </h4>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold my-4">
            Maximise Your<br/> Property Savings
          </h1>
          <h3 className="text-lg md:text-xl">
            Trusted Professionals Committed To Reducing
            <br /> Your Property Tax Burden - No Savings, No Fees!
          </h3>
        </div>
        <div className="flex gap-4 mt-8">
          <button
            onClick={() => setIsDialogOpen(true)}
            className="flex items-center bg-blue-400 text-white p-2 md:px-8 rounded mb-4 md:mb-0 h-16 group"
          >
            Get Started Now
            <ArrowRight
              className="ml-4 transform transition-transform group-hover:translate-x-2"
              size={18}
            />
          </button>
        </div>
      </div>

      {/* Right Section */}
      <div className="w-full md:w-1/2 md:mr-16  h-full md:h-1/2 rounded-full  md:hidden">
        <img
          src={heroImage}
          alt="Hero Image"
          className="relative z-10 w-full max-w-md md:max-w-[50%] rounded-full shadow-md"
        />
      </div>
      <ContactDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />

      <div className="mb-10 hidden md:block ">
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 610 640"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="absolute z-0 w-[80%] md:w-[90%] lg:w-[500px] h-auto top-0 right-0 md:hidden lg:block text-brand-blue"
        >
          <circle
            opacity="0.5"
            cx="420"
            cy="180"
            r="370"
            fill="currentColor"
            fillOpacity="0.8"
          />
        </svg>
        <img
          src={heroImage}
          alt="Hero Image"
          className="relative z-10 w-[500px] rounded-full mt-16 "
        />
      </div>
    </div>
  );
};

export default Hero;
