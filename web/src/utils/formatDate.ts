const formatDate = (isoDate: string): string => {
  if (isoDate == "N/A") {
    return isoDate;
  }
  const date = new Date(isoDate);
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const month = months[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();

  if (!month || !day || !year) {
    return `-`
  }

  return `${month} ${day}, ${year}`;
};

export default formatDate;
