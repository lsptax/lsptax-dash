import w1 from "@/assets/work/w1.png";
import w2 from "@/assets/work/w2.png";
import w3 from "@/assets/work/w3.png";

// const workProcessCopy = [
//   {
//     image: w1,
//     title: "We submit your protest",
//     desc: "We handle your property tax protest from start to finish, ensuring all paperwork is filed accurately and on time for a better chance at reduction.",
//     color: "#0056B3",
//   },
//   {
//     image: w2,
//     title: "We gather the evidence",
//     desc: "We collect key evidence like market trends and property data to build a strong case for lowering your taxes.",
//     color: "#FFD700",
//   },
//   {
//     image: w3,
//     title: "We fight your case",
//     desc: "We negotiate with tax authorities on your behalf to secure a fair property tax reduction.",
//     color: "#FF4500",
//   },
// ];

const WorkProcess = () => {
  return (
    
<div id="how" className="bg-brand-dark">
<div className="bg-brand-dark text-white pt-16 relative">
  {/* Title Section */}
  <div className="text-center">
    <h3 className="text-blue-400 text-lg font-semibold">Work process</h3>
    <h2 className="text-4xl font-bold mt-2">How it works</h2>
  </div>

  <div className="relative mt-12 flex flex-col lg:flex-row items-center justify-center space-y-12 lg:space-y-0 lg:space-x-16 px-6 lg:px-24 ">
    {/* Curved Dotted Lines using SVG */}
    <svg
      className="absolute top-[50%] left-0 w-full h-32 z-0 hidden lg:block"
      viewBox="-30 -30 1000 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* First Curve (Step 1 to Step 2) */}
      <path
        d="M1.01624 1.354 C1.01624 1.354 59.9986 11.91 161.014 16.8775C262.03 21.845 325.758 16.8775 400.758 25.8775"
        stroke="white"
        strokeWidth="2"
        strokeDasharray="1 10"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
    {/* Second Curve (Step 2 to Step 3) */}
    <svg
      className="absolute top-[50%] left-0 w-full h-32 z-0 hidden lg:block"
      viewBox="-550 -60 1000 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M1.18097 9.39362 C10.18097 9.39362 105.925 1.94215 180.585 1.94215 C300.245 0.94215 400.854 60.8447 400.854 60.8447"
        stroke="white"
        strokeWidth="2"
        strokeDasharray="1 10"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
    {/* Step 1 */}
    <div className="flex flex-col items-center text-center relative z-10 ">
      <img
        src={w1}
        alt="Step 1"
        className="w-40 h-40 rounded shadow-lg"
      />
      <div className="bg-blue-500 text-white rounded-full px-4 py-2 font-bold mt-3">
        01
      </div>
      <h3 className="text-xl font-semibold mt-4">We submit your protest</h3>
      <p className="mt-4 text-gray-300 max-w-xs text-left">
        We handle everything from start to finish, ensuring your protest is submitted correctly and on time.
      </p>
    </div>

    {/* Step 2 */}
    <div className="flex flex-col items-center text-center relative z-10 pt-12 ">
      <img
        src={w2}
        alt="Step 2"
        className="w-40 h-40 rounded shadow-lg"
      />
      <div className="bg-blue-500 text-white rounded-full px-4 py-2 font-bold mt-3">
        02
      </div>
      <h3 className="text-xl font-semibold mt-4">We gather the evidence</h3>
      <p className="mt-4 text-gray-300 max-w-xs text-left">
        Our team collects all necessary data to strengthen your case and challenge over-assessments.
      </p>
    </div>

    {/* Step 3 */}
    <div className="flex flex-col items-center text-center relative z-10 pt-24">
      <img
        src={w3}
        alt="Step 3"
        className="w-40 h-40 rounded shadow-lg"
      />
      <div className="bg-blue-500 text-white rounded-full px-4 py-2 font-bold mt-3">
        03
      </div>
      <h3 className="text-xl font-semibold mt-4">We fight your case</h3>
      <p className="mt-4 text-gray-300 max-w-xs text-left">
        We advocate on your behalf to ensure a fair reduction in your property taxes.
      </p>
    </div>
  </div>

</div>
<svg width="195" height="162" viewBox="0 0 195 162" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-brand-blue">
  <path d="M145.607 20.5168C105.767 -4.10374 59.9259 -6.49496 19.5914 12.9628C10.1654 17.5092 0.113914 21.1114 -7.49215 27.5769C-37.2716 41.5484 -56.2682 66.252 -66.3118 99.2267C-87.93 170.199 -31.3975 227.151 33.8418 244.555C93.4724 260.463 156.702 242.028 180.269 182.496C203.543 123.703 203.849 56.5078 145.607 20.5168Z" fill="currentColor" />
</svg>

</div>
  );
};

export default WorkProcess;
