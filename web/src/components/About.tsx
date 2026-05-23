import aboutImage from "@/assets/about/about.svg";
import checkboxIcon from "@/assets/icons/checkbox.svg";

const points = [
  { title: "Unlock Significant Savings on Your Property Taxes" },
  { title: "Achieve Fair and Accurate Property Tax Assessments" },
  { title: "Maximise Your Savings with Expert Tax Consultants" },
  { title: "Realize Substantial Property Tax Savings" },
];

const About = () => {
  return (
    <div className="flex flex-col md:flex-row md:h-screen py-8 mb-16" id="about">
      {/* Left Section - Image */}
      <div
        className="w-full md:w-1/2 flex justify-center items-center mb-8 md:mb-0"
        data-aos="fade-left"
      >
        <img src={aboutImage} alt="Lone Star Property Tax - About Us" className="w-full max-w-[500px]" />
      </div>

      {/* Right Section - Text */}
      <div className="w-full md:w-1/2 flex flex-col justify-center px-4">
        <h2
          className="border-l-4 border-blue-400 px-4 text-xl md:text-2xl "
          data-aos="fade-down"
        >
          About Us
        </h2>
        <h1
          className="text-3xl md:text-4xl font-bold my-4"
          data-aos="fade-down"
        >
          Lone Star Property Tax
        </h1>
        <p className="text-sm md:text-base py-2 md:w-3/4" data-aos="fade-up">
          At Lone Star Property Tax, we help property owners achieve fair tax
          rates through expert assessment reviews and reduction strategies. With
          deep knowledge of Texas property tax law, we identify inaccuracies,
          negotiate reductions, and offer a “No Savings, No Fee” guarantee for a
          risk-free experience.
        </p>

        {/* Points */}
        <div className="h-full">

        {points.map((item, index) => (
          <div
          key={index}
          className="flex items-center py-2"
          data-aos="fade-up"
          >
            <img src={checkboxIcon} className="w-6 h-6 mr-4" alt="Included" aria-hidden />
            <h2 className="text-sm md:text-base">{item.title}</h2>
          </div>
        ))}
      </div>
      </div>
    </div>
  );
};

export default About;
