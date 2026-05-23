"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const counties = [
  {
    value: "001",
    label: "Anderson",
  },
  {
    value: "002",
    label: "Andrews",
  },
  {
    value: "003",
    label: "Angelina",
  },
  {
    value: "004",
    label: "Aransas",
  },
  {
    value: "005",
    label: "Archer",
  },
  {
    value: "006",
    label: "Armstrong",
  },
  {
    value: "007",
    label: "Atascosa",
  },
  {
    value: "008",
    label: "Austin",
  },
  {
    value: "009",
    label: "Bailey",
  },
  {
    value: "010",
    label: "Bandera",
  },
  {
    value: "011",
    label: "Bastrop",
  },
  {
    value: "012",
    label: "Baylor",
  },
  {
    value: "013",
    label: "Bee",
  },
  {
    value: "014",
    label: "Bell",
  },
  {
    value: "015",
    label: "Bexar",
  },
  {
    value: "016",
    label: "Blanco",
  },
  {
    value: "017",
    label: "Borden",
  },
  {
    value: "018",
    label: "Bosque",
  },
  {
    value: "019",
    label: "Bowie",
  },
  {
    value: "020",
    label: "Brazoria",
  },
  {
    value: "021",
    label: "Brazos",
  },
  {
    value: "022",
    label: "Brewster",
  },
  {
    value: "023",
    label: "Briscoe",
  },
  {
    value: "024",
    label: "Brooks",
  },
  {
    value: "025",
    label: "Brown",
  },
  {
    value: "026",
    label: "Burleson",
  },
  {
    value: "027",
    label: "Burnet",
  },
  {
    value: "028",
    label: "Caldwell",
  },
  {
    value: "029",
    label: "Calhoun",
  },
  {
    value: "030",
    label: "Callahan",
  },
  {
    value: "031",
    label: "Cameron",
  },
  {
    value: "032",
    label: "Camp",
  },
  {
    value: "033",
    label: "Carson",
  },
  {
    value: "034",
    label: "Cass",
  },
  {
    value: "035",
    label: "Castro",
  },
  {
    value: "036",
    label: "Chambers",
  },
  {
    value: "037",
    label: "Cherokee",
  },
  {
    value: "038",
    label: "Childress",
  },
  {
    value: "039",
    label: "Clay",
  },
  {
    value: "040",
    label: "Cochran",
  },
  {
    value: "041",
    label: "Coke",
  },
  {
    value: "042",
    label: "Coleman",
  },
  {
    value: "043",
    label: "Collin",
  },
  {
    value: "044",
    label: "Collingsworth",
  },
  {
    value: "045",
    label: "Colorado",
  },
  {
    value: "046",
    label: "Comal",
  },
  {
    value: "047",
    label: "Comanche",
  },
  {
    value: "048",
    label: "Concho",
  },
  {
    value: "049",
    label: "Cooke",
  },
  {
    value: "050",
    label: "Coryell",
  },
  {
    value: "051",
    label: "Cottle",
  },
  {
    value: "052",
    label: "Crane",
  },
  {
    value: "053",
    label: "Crockett",
  },
  {
    value: "054",
    label: "Crosby",
  },
  {
    value: "055",
    label: "Culberson",
  },
  {
    value: "056",
    label: "Dallam",
  },
  {
    value: "057",
    label: "Dallas",
  },
  {
    value: "058",
    label: "Dawson",
  },
  {
    value: "059",
    label: "Deaf Smith",
  },
  {
    value: "060",
    label: "Delta",
  },
  {
    value: "061",
    label: "Denton",
  },
  {
    value: "062",
    label: "DeWitt",
  },
  {
    value: "063",
    label: "Dickens",
  },
  {
    value: "064",
    label: "Dimmitt",
  },
  {
    value: "065",
    label: "Donley",
  },
  {
    value: "066",
    label: "Duval",
  },
  {
    value: "067",
    label: "Eastland",
  },
  {
    value: "068",
    label: "Ector",
  },
  {
    value: "069",
    label: "Edwards",
  },
  {
    value: "070",
    label: "Ellis",
  },
  {
    value: "071",
    label: "El Paso",
  },
  {
    value: "072",
    label: "Erath",
  },
  {
    value: "073",
    label: "Falls",
  },
  {
    value: "074",
    label: "Fannin",
  },
  {
    value: "075",
    label: "Fayette",
  },
  {
    value: "076",
    label: "Fisher",
  },
  {
    value: "077",
    label: "Floyd",
  },
  {
    value: "078",
    label: "Foard",
  },
  {
    value: "079",
    label: "Fort Bend",
  },
  {
    value: "080",
    label: "Franklin",
  },
  {
    value: "081",
    label: "Freestone",
  },
  {
    value: "082",
    label: "Frio",
  },
  {
    value: "083",
    label: "Gaines",
  },
  {
    value: "084",
    label: "Galveston",
  },
  {
    value: "085",
    label: "Garza",
  },
  {
    value: "086",
    label: "Gillespie",
  },
  {
    value: "087",
    label: "Glasscock",
  },
  {
    value: "088",
    label: "Goliad",
  },
  {
    value: "089",
    label: "Gonzales",
  },
  {
    value: "090",
    label: "Gray",
  },
  {
    value: "091",
    label: "Grayson",
  },
  {
    value: "092",
    label: "Gregg",
  },
  {
    value: "093",
    label: "Grimes",
  },
  {
    value: "094",
    label: "Guadalupe",
  },
  {
    value: "095",
    label: "Hale",
  },
  {
    value: "096",
    label: "Hall",
  },
  {
    value: "097",
    label: "Hamilton",
  },
  {
    value: "098",
    label: "Hansford",
  },
  {
    value: "099",
    label: "Hardeman",
  },
  {
    value: "100",
    label: "Hardin",
  },
  {
    value: "101",
    label: "Harris",
  },
  {
    value: "102",
    label: "Harrison",
  },
  {
    value: "103",
    label: "Hartley",
  },
  {
    value: "104",
    label: "Haskell",
  },
  {
    value: "105",
    label: "Hays",
  },
  {
    value: "106",
    label: "Hemphill",
  },
  {
    value: "107",
    label: "Henderson",
  },
  {
    value: "108",
    label: "Hidalgo",
  },
  {
    value: "109",
    label: "Hill",
  },
  {
    value: "110",
    label: "Hockley",
  },
  {
    value: "111",
    label: "Hood",
  },
  {
    value: "112",
    label: "Hopkins",
  },
  {
    value: "113",
    label: "Houston",
  },
  {
    value: "114",
    label: "Howard",
  },
  {
    value: "115",
    label: "Hudspeth",
  },
  {
    value: "116",
    label: "Hunt",
  },
  {
    value: "117",
    label: "Hutchinson",
  },
  {
    value: "118",
    label: "Irion",
  },
  {
    value: "119",
    label: "Jack",
  },
  {
    value: "120",
    label: "Jackson",
  },
  {
    value: "121",
    label: "Jasper",
  },
  {
    value: "122",
    label: "Jeff Davis",
  },
  {
    value: "123",
    label: "Jefferson",
  },
  {
    value: "124",
    label: "Jim Hogg",
  },
  {
    value: "125",
    label: "Jim Wells",
  },
  {
    value: "126",
    label: "Johnson",
  },
  {
    value: "127",
    label: "Jones",
  },
  {
    value: "128",
    label: "Karnes",
  },
  {
    value: "129",
    label: "Kaufman",
  },
  {
    value: "130",
    label: "Kendall",
  },
  {
    value: "131",
    label: "Kenedy",
  },
  {
    value: "132",
    label: "Kent",
  },
  {
    value: "133",
    label: "Kerr",
  },
  {
    value: "134",
    label: "Kimble",
  },
  {
    value: "135",
    label: "King",
  },
  {
    value: "136",
    label: "Kinney",
  },
  {
    value: "137",
    label: "Kleberg",
  },
  {
    value: "138",
    label: "Knox",
  },
  {
    value: "139",
    label: "Lamar",
  },
  {
    value: "140",
    label: "Lamb",
  },
  {
    value: "141",
    label: "Lampasas",
  },
  {
    value: "142",
    label: "La Salle",
  },
  {
    value: "143",
    label: "Lavaca",
  },
  {
    value: "144",
    label: "Lee",
  },
  {
    value: "145",
    label: "Leon",
  },
  {
    value: "146",
    label: "Liberty",
  },
  {
    value: "147",
    label: "Limestone",
  },
  {
    value: "148",
    label: "Lipscomb",
  },
  {
    value: "149",
    label: "Live Oak",
  },
  {
    value: "150",
    label: "Llano",
  },
  {
    value: "151",
    label: "Loving",
  },
  {
    value: "152",
    label: "Lubbock",
  },
  {
    value: "153",
    label: "Lynn",
  },
  {
    value: "154",
    label: "McCulloch",
  },
  {
    value: "155",
    label: "McLennan",
  },
  {
    value: "156",
    label: "McMullen",
  },
  {
    value: "157",
    label: "Madison",
  },
  {
    value: "158",
    label: "Marion",
  },
  {
    value: "159",
    label: "Martin",
  },
  {
    value: "160",
    label: "Mason",
  },
  {
    value: "161",
    label: "Matagorda",
  },
  {
    value: "162",
    label: "Maverick",
  },
  {
    value: "163",
    label: "Medina",
  },
  {
    value: "164",
    label: "Menard",
  },
  {
    value: "165",
    label: "Midland",
  },
  {
    value: "166",
    label: "Milam",
  },
  {
    value: "167",
    label: "Mills",
  },
  {
    value: "168",
    label: "Mitchell",
  },
  {
    value: "169",
    label: "Montague",
  },
  {
    value: "170",
    label: "Montgomery",
  },
  {
    value: "171",
    label: "Moore",
  },
  {
    value: "172",
    label: "Morris",
  },
  {
    value: "173",
    label: "Motley",
  },
  {
    value: "174",
    label: "Nacogdoches",
  },
  {
    value: "175",
    label: "Navarro",
  },
  {
    value: "176",
    label: "Newton",
  },
  {
    value: "177",
    label: "Nolan",
  },
  {
    value: "178",
    label: "Nueces",
  },
  {
    value: "179",
    label: "Ochiltree",
  },
  {
    value: "180",
    label: "Oldham",
  },
  {
    value: "181",
    label: "Orange",
  },
  {
    value: "182",
    label: "Palo Pinto",
  },
  {
    value: "183",
    label: "Panola",
  },
  {
    value: "184",
    label: "Parker",
  },
  {
    value: "185",
    label: "Parmer",
  },
  {
    value: "186",
    label: "Pecos",
  },
  {
    value: "187",
    label: "Polk",
  },
  {
    value: "188",
    label: "Potter",
  },
  {
    value: "189",
    label: "Presidio",
  },
  {
    value: "190",
    label: "Rains",
  },
  {
    value: "191",
    label: "Randall",
  },
  {
    value: "192",
    label: "Reagan",
  },
  {
    value: "193",
    label: "Real",
  },
  {
    value: "194",
    label: "Red River",
  },
  {
    value: "195",
    label: "Reeves",
  },
  {
    value: "196",
    label: "Refugio",
  },
  {
    value: "197",
    label: "Roberts",
  },
  {
    value: "198",
    label: "Robertson",
  },
  {
    value: "199",
    label: "Rockwall",
  },
  {
    value: "200",
    label: "Runnels",
  },
  {
    value: "201",
    label: "Rusk",
  },
  {
    value: "202",
    label: "Sabine",
  },
  {
    value: "203",
    label: "San Augustine",
  },
  {
    value: "204",
    label: "San Jacinto",
  },
  {
    value: "205",
    label: "San Patricio",
  },
  {
    value: "206",
    label: "San Saba",
  },
  {
    value: "207",
    label: "Schleicher",
  },
  {
    value: "208",
    label: "Scurry",
  },
  {
    value: "209",
    label: "Shackelford",
  },
  {
    value: "210",
    label: "Shelby",
  },
  {
    value: "211",
    label: "Sherman",
  },
  {
    value: "212",
    label: "Smith",
  },
  {
    value: "213",
    label: "Somervell",
  },
  {
    value: "214",
    label: "Starr",
  },
  {
    value: "215",
    label: "Stephens",
  },
  {
    value: "216",
    label: "Sterling",
  },
  {
    value: "217",
    label: "Stonewall",
  },
  {
    value: "218",
    label: "Sutton",
  },
  {
    value: "219",
    label: "Swisher",
  },
  {
    value: "220",
    label: "Tarrant",
  },
  {
    value: "221",
    label: "Taylor",
  },
  {
    value: "222",
    label: "Terrell",
  },
  {
    value: "223",
    label: "Terry",
  },
  {
    value: "224",
    label: "Throckmorton",
  },
  {
    value: "225",
    label: "Titus",
  },
  {
    value: "226",
    label: "Tom Green",
  },
  {
    value: "227",
    label: "Travis",
  },
  {
    value: "228",
    label: "Trinity",
  },
  {
    value: "229",
    label: "Tyler",
  },
  {
    value: "230",
    label: "Upshur",
  },
  {
    value: "231",
    label: "Upton",
  },
  {
    value: "232",
    label: "Uvalde",
  },
  {
    value: "233",
    label: "Val Verde",
  },
  {
    value: "234",
    label: "Van Zandt",
  },
  {
    value: "235",
    label: "Victoria",
  },
  {
    value: "236",
    label: "Walker",
  },
  {
    value: "237",
    label: "Waller",
  },
  {
    value: "238",
    label: "Ward",
  },
  {
    value: "239",
    label: "Washington",
  },
  {
    value: "240",
    label: "Webb",
  },
  {
    value: "241",
    label: "Wharton",
  },
  {
    value: "242",
    label: "Wheeler",
  },
  {
    value: "243",
    label: "Wichita",
  },
  {
    value: "244",
    label: "Wilbarger",
  },
  {
    value: "245",
    label: "Willacy",
  },
  {
    value: "246",
    label: "Williamson",
  },
  {
    value: "247",
    label: "Wilson",
  },
  {
    value: "248",
    label: "Winkler",
  },
  {
    value: "249",
    label: "Wise",
  },
  {
    value: "250",
    label: "Wood",
  },
  {
    value: "251",
    label: "Yoakum",
  },
  {
    value: "252",
    label: "Young",
  },
  {
    value: "253",
    label: "Zapata",
  },
  {
    value: "254",
    label: "Zavala",
  },
];
export function Combobox() {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState("");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between ml-4"
        >
          {value
            ? counties.find((county) => county.value === value)?.label
            : "Select County..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search county..." />
          <CommandList>
            <CommandEmpty>No framework found.</CommandEmpty>
            <CommandGroup>
              {counties.map((county) => (
                <CommandItem
                  key={county.value}
                  value={county.value}
                  onSelect={(currentValue) => {
                    setValue(currentValue === value ? "" : currentValue);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === county.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {county.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
