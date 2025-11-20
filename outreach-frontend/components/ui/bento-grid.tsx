import { ReactNode } from "react";
import { ArrowRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const BentoGrid = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        "grid w-full auto-rows-[22rem] grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {children}
    </div>
  );
};

const BentoCard = ({
  name,
  className,
  background,
  Icon,
  description,
  href,
  cta,
}: {
  name: string;
  className?: string;
  background?: ReactNode;
  Icon?: any;
  description: string;
  href?: string;
  cta?: string;
}) => (
  <div
    className={cn(
      "group relative col-span-1 flex flex-col justify-between overflow-hidden rounded-xl border border-gray-200 bg-white transition-colors hover:bg-gray-50",
      className,
    )}
  >
    {background && (
      <div className="absolute inset-0">
        {background}
      </div>
    )}
    <div className="relative z-10 flex flex-col gap-2 p-6">
      {Icon && (
        <Icon className="h-10 w-10 text-black" />
      )}
      <h3 className="text-lg font-semibold text-black">
        {name}
      </h3>
      <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
    </div>

    {href && cta && (
      <div className="relative z-10 p-4 pt-0">
        <Button
          variant="ghost"
          asChild
          size="sm"
          className="text-black hover:bg-gray-100"
        >
          <a href={href} className="inline-flex items-center gap-2">
            {cta}
            <ArrowRightIcon className="h-4 w-4" />
          </a>
        </Button>
      </div>
    )}
  </div>
);

export { BentoCard, BentoGrid };
