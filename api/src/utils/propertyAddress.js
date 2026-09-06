/**
 * CAD mailing address display: prefer explicit CAD fields, fall back to populated mailing address.
 */
export function buildCadMailingAddressDisplay(property) {
  if (!property) return { line1: "", line2: "", full: "" };

  const cadLine = String(property.cadMailingAddress ?? "").trim();
  const cadCity = String(property.cadCity ?? "").trim();
  const cadZip = String(property.cadZipCode ?? "").trim();
  const cadCityZip = [cadCity, cadZip].filter(Boolean).join(", ");

  if (cadLine || cadCityZip) {
    return {
      line1: cadLine,
      line2: cadCityZip,
      full: [cadLine, cadCityZip].filter(Boolean).join(", "),
    };
  }

  const mailingLine = String(property.mailingAddress ?? "").trim();
  const mailingCityZip = String(property.mailingAddressCityTxZip ?? "").trim();
  return {
    line1: mailingLine,
    line2: mailingCityZip,
    full: [mailingLine, mailingCityZip].filter(Boolean).join(", "),
  };
}
