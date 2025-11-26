import shipImage from "../../assets/ship.png";
import { Button } from "@/components/ui/button";

export default function OfferCard() {
    return (
        <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-4 w-full max-w-sm mx-auto">
            {/* Photo Container */}
            <div className="bg-gray-100 mb-4 rounded-lg overflow-hidden">
                <img
                    src={shipImage.src}
                    alt="Ship illustration"
                    className="w-full h-auto aspect-square object-cover"
                />
            </div>

            {/* Caption Area */}
            <div className="flex flex-col gap-4">
                <div className="text-left">
                    <h2 className="text-xl font-medium text-black" style={{ fontFamily: "'Mencken Std Narrow Regular', serif" }}>
                        Exploring?
                    </h2>
                    <p className="text-md font-medium text-gray-500" style={{ fontFamily: "'Mencken Std Narrow Regular', serif" }}>
                        Spend 500 credits, get 500 free!
                    </p>
                </div>

                <Button className="w-full bg-black text-white hover:bg-gray-800 font-medium rounded-lg h-10 shadow-none" style={{ fontFamily: "'Mencken Std Narrow Regular', serif" }}>
                    Claim Offer
                </Button>
            </div>
        </div>
    );
}
