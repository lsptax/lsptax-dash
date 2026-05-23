import { useEffect, useState } from "react";
import { NavLink, useSearchParams } from "react-router-dom";
import { getProspectProperty } from "@/store/data";
import { Mail, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProspectPropertyData } from "@/types/types";
import { routes } from "@/routes/ROUTES";

const ProspectPropertyPage = () => {
  const [property, setProperty] = useState<ProspectPropertyData>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchParams] = useSearchParams();
  const idParam = searchParams.get("id");

  useEffect(() => {
    setError("");
    setProperty(undefined);

    const fetchProperty = async () => {
      if (!idParam) {
        setError("Property ID is missing");
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const propertyData = await getProspectProperty({ propertyId: idParam });
        setProperty(propertyData);
      } catch (err) {
        console.error("Error:", err);
        setError("Failed to fetch property details");
      } finally {
        setLoading(false);
      }
    };

    fetchProperty();
  }, [idParam]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg font-semibold text-gray-700">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg font-semibold text-red-600">{error}</div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg font-semibold text-gray-700">
          No property details to display
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-4 bg-white shadow-md rounded-lg">
      <div className="flex flex-col md:flex-row justify-between ">
        <h1 className="text-2xl font-bold text-gray-800 mb-2 ">
          View Property
        </h1>
        <div className="flex gap-4 flex-col md:flex-row w-full md:w-auto">
          <NavLink
            to={routes.editProspectProperties(property.propertyDetails.id)}
          >
            <Button className="w-full">Edit Property</Button>
          </NavLink>
          <NavLink
            to={routes.prospect.aoa(property.propertyDetails.id)}
          >
            <Button className="w-full" variant="outline">
              Create AOA
            </Button>
          </NavLink>
        </div>
      </div>

      <div className="flex flex-col md:flex-row align-center items-center justify-between items-center border rounded-xl bg-gray-100 my-2 p-4">
        <h1 className="text-4xl font-bold text-center">
          Lone Star Property Tax
        </h1>
        <div className="text-lg">
          <h1 className="flex gap-2">
            Property No:
            <p className="font-bold">
              #{property.propertyDetails.accountNumber}
            </p>
          </h1>
          <h2 className="flex gap-2">
            Prospect No:
            <p className="font-bold">
              #{property.propertyDetails.clientNumber}
            </p>
          </h2>
        </div>
      </div>

      <div className="gap-2 flex flex-col md:flex-row justify-between ">
        {/* Client Details Table */}
        <div className="border rounded-xl p-4 w-full">
          <h2 className="font-semibold text-lg mb-2">Client Details</h2>
          <table className="table-auto w-full">
            <tbody>
              <tr>
                <td className="font-medium">Client:</td>
                <td>{property.clientDetails?.clientName}</td>
              </tr>
              <tr>
                <td className="font-medium">Phone:</td>
                <td>
                  <Phone size={18} className="inline text-indigo-600 mr-2" />
                  {property.clientDetails?.phoneNumber}
                </td>
              </tr>
              <tr>
                <td className="font-medium">Email:</td>
                <td>
                  <Mail size={18} className="inline text-indigo-600 mr-2" />
                  {property.clientDetails?.email}
                </td>
              </tr>
              <tr>
                <td className="font-medium">Address:</td>
                <td>
                  <MapPin size={18} className="inline text-indigo-600 mr-2" />
                  {property?.propertyDetails.mailingAddress},{" "}
                  {property?.propertyDetails.mailingAddressCityTxZip}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Property Details Table */}
        <div className="border rounded-xl p-4 w-full">
          <h2 className="font-semibold text-lg mb-2">Property Details</h2>
          <table className="table-auto w-full">
            <tbody>
              <tr>
                <td className="font-medium">Name on CAD:</td>
                <td>{property.propertyDetails.nameOnCad || "—"}</td>
              </tr>
              <tr>
                <td className="font-medium">Property Address:</td>
                <td>
                  {property.propertyDetails.propertyAddress || "—"}
                </td>
              </tr>
              <tr>
                <td className="font-medium">County:</td>
                <td>{property.propertyDetails.cadCounty || "—"}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProspectPropertyPage;
