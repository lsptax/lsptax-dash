"use client";

// import { useState } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";
import Autoplay from "embla-carousel-autoplay";
import avatar from "@/assets/icons/avatar.svg";
import avatar2 from "@/assets/icons/avatar2.png";
import avatar3 from "@/assets/icons/avatar3.png";

const testimonials = [
  {
    avatar: avatar,
    starRating: 5,
    comment:
      "“Could not be happier with Hussain and Lone Star Property Tax. From the first consultation to the end, Hussain was clear in laying out expectations and finding a solution to our property tax issues.”",
    name: "Armand J",
  },
  {
    avatar: avatar2,
    starRating: 5,
    comment:
      "“I highly recommend Lone Star Property Tax LLC. Hussain Ali is incredibly knowledgeable and saved me a lot of money by protesting my property taxes. Thanks to Hussain Ali, I was able to reduce my taxes significantly.”",
    name: "Ali Pourmemar",
  },
  {
    avatar: avatar3,
    starRating: 5,
    comment:
      "“Signed up for the 2021 tax year. They helped me get my home well below what I purchased it for 3 years ago. Would highly recommend them to fight property taxes!!”",
    name: "Amin Lalani",
  },
];

const Testimonials = () => {
  // const [activeIndex, setActiveIndex] = useState(0);

  return (
    <div className="bg-brand-background flex flex-col justify-center items-center py-12 px-6">
      <h1 className="text-3xl font-bold text-gray-800 tracking-wide text-center mb-6">
        Our Clients Speak for Us
      </h1>

      {/* Swipable Testimonial Section using ShadCN Carousel */}
      <Carousel
        className="w-full max-w-2xl"
        plugins={[
          Autoplay({
            delay: 2000,
          }),
        ]}
      >
        <CarouselContent>
          {testimonials.map((testimonial, index) => (
            <CarouselItem key={index} className="flex justify-center">
              <TestimonialItem {...testimonial} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>

      {/* Selection Buttons for Large Screens */}
      {/* <div className="hidden md:flex justify-center gap-4 mt-8">
        {testimonials.map((testimonial, index) => (
          <Button
            key={index}
            onClick={() => setActiveIndex(index)}
            variant={activeIndex === index ? "default" : "outline"}
            className="w-48"
          >
            {testimonial.name}
          </Button>
        ))}
      </div> */}
    </div>
  );
};

const TestimonialItem = ({
  avatar,
  starRating,
  comment,
  name,
}: {
  avatar: string;
  starRating: number;
  comment: string;
  name: string;
}) => {
  return (
    <Card className="w-full max-w-lg p-6 flex flex-col items-center text-center shadow-lg">
      <img
        src={avatar}
        alt="avatar"
        className="h-20 w-20 rounded-full border-4 border-blue-500 mb-4 shadow-lg"
      />
      <CardContent>
        <StarRating rating={starRating} />
        <p className="text-lg italic text-gray-700">{comment}</p>
        <h1 className="font-bold">~{name}</h1>
      </CardContent>
    </Card>
  );
};

const StarRating = ({ rating }: { rating: number }) => {
  return (
    <div className="flex justify-center mb-4 text-yellow-500">
      {[...Array(5)].map((_, index) => (
        <span key={index} className="text-2xl">
          {index < rating ? "★" : "☆"}
        </span>
      ))}
    </div>
  );
};

export default Testimonials;
