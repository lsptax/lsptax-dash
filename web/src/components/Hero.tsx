import heroImage from "@/assets/hero.svg";
import { ArrowRight } from "lucide-react";
import { useState } from "react";
import ContactDialog from "./ContactDialog";

const Hero = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  return (
    <div
      id="hero"
      className="relative overflow-hidden bg-background px-6 py-12 md:px-12 md:py-16 lg:px-16 flex flex-col md:flex-row items-center justify-between"
    >
      {/* /h */}
      {/* Left Section */}
      <div className="w-full md:w-1/2 flex flex-col items-start md:max-w-xl mb-8 md:mb-0">
        <div className="w-full">
          <h4 className="border-l-4 border-primary pl-3 text-sm font-medium text-muted-foreground">
            Offering the best tax reduction services
          </h4>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mt-4 text-foreground">
            Maximise Your<br /> Property Savings
          </h1>
          <p className="text-base md:text-lg text-muted-foreground mt-4 leading-relaxed">
            Trusted professionals committed to reducing
            <br className="hidden md:block" /> your property tax burden — no savings, no fees.
          </p>
        </div>
        <div className="flex gap-4 mt-8">
          <button
            onClick={() => setIsDialogOpen(true)}
            className="inline-flex items-center bg-primary text-primary-foreground h-11 px-6 rounded-md text-sm font-medium group"
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
          className="absolute z-0 w-[80%] md:w-[90%] lg:w-[500px] h-auto top-0 right-0 md:hidden lg:block text-primary/20"
        >
          <circle
            opacity="0.35"
            cx="420"
            cy="180"
            r="370"
            fill="currentColor"
            fillOpacity="0.45"
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
