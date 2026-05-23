

const keyDateData = [
  {
    date: "January 1",
    desc: "Property is valued in the current condition as of January 1 of the property tax year. Most exemptions are also set as of January 1st of the current year.",
  },
  {
    date: "January 5-31",
    desc: "Rendition forms are sent out by the appraisal districts to business owners for their personal property.",
  },
  {
    date: "January 31",
    desc: "Last day to file corrections to protest last year’s assessed values under late protest provisions. Last day to pay property taxes without penalties and interest.",
  },
  {
    date: "April 15",
    desc: "Deadline to timely file your rendition or an extension form. If you mail in the rendition or extension form, it must be postmarked on or before this date.",
  },
  {
    date: "May 15",
    desc: "Deadline to file protests of assessed value, or 30 days after the date the notice of appraised value is mailed, whichever is the later date.",
  },
];

interface KeyDateData {
  date: string;
  desc: string;
}

const KeyDates = () => {
  return (
    <div
      id="keydates"
      className="flex flex-col  justify-center items-center align-center p-8 gap-16 my-8"
    >
      {/* <div className="" data-aos="zoom-in-right">
        <img src={keyDateLogo} alt="Key Dates" className="w-32" />
      </div> */}
      <h2 className="text-4xl font-bold mt-2">Key Dates</h2>
      <div className="w-full md:w-2/3">
        {keyDateData.map((item, index) => (
          <KeyDateItem key={index} date={item.date} desc={item.desc} />
        ))}
      </div>
    </div>
  );
};

const KeyDateItem: React.FC<KeyDateData> = ({ date, desc }) => {
  return (
    <div
      className="flex flex-col md:flex-row justify-center items-center w-full border-b-2 p-8 hover:bg-brand-background h-auto"
      data-aos="zoom-in-right"
    >
      <div className="text-center w-full md:w-1/3 text-xl text-blue-400 font-bold mb-4 md:mb-0">
        {date}
      </div>
      <div className="w-full md:w-2/3 text-left leading-loose">{desc}</div>
    </div>
  );
};

export default KeyDates;
