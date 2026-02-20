import { cn } from "@/lib/utils";
import {
  AnimatePresence,
  MotionValue,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import Link from "next/link";
import { useRef, useState } from "react";

export const FloatingDock = ({
  items,
  desktopClassName,
  mobileClassName,
}: {
  items: { title: string; icon: React.ReactNode; href?: string; onClick?: () => void }[];
  desktopClassName?: string;
  mobileClassName?: string;
}) => {
  return (
    <>
      <FloatingDockDesktop items={items} className={desktopClassName} />
      <FloatingDockMobile items={items} className={mobileClassName} />
    </>
  );
};

const FloatingDockMobile = ({
  items,
  className,
}: {
  items: { title: string; icon: React.ReactNode; href?: string; onClick?: () => void }[];
  className?: string;
}) => {
  return (
    <div className={cn("block md:hidden w-full", className)}>
      <div 
        className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4 touch-pan-x"
        style={{ 
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
      >
        {items.map((item) => (
          item.href ? (
            <Link
              href={item.href}
              key={item.title}
              className="flex flex-col items-center gap-1 flex-shrink-0"
            >
              <div className="h-12 w-12 rounded-xl bg-neutral-900 flex items-center justify-center border border-neutral-800 active:scale-95 transition-transform">
                <div className="h-5 w-5">{item.icon}</div>
              </div>
              <span className="text-[10px] text-neutral-400 whitespace-nowrap">{item.title}</span>
            </Link>
          ) : (
            <button
              key={item.title}
              onClick={item.onClick}
              className="flex flex-col items-center gap-1 flex-shrink-0"
            >
              <div className="h-12 w-12 rounded-xl bg-neutral-900 flex items-center justify-center border border-neutral-800 active:scale-95 transition-transform">
                <div className="h-5 w-5">{item.icon}</div>
              </div>
              <span className="text-[10px] text-neutral-400 whitespace-nowrap">{item.title}</span>
            </button>
          )
        ))}
      </div>
    </div>
  );
};

const FloatingDockDesktop = ({
  items,
  className,
}: {
  items: { title: string; icon: React.ReactNode; href?: string; onClick?: () => void }[];
  className?: string;
}) => {
  const mouseX = useMotionValue(Infinity);

  return (
    <motion.div
      onMouseMove={(e) => mouseX.set(e.clientX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className={cn(
        "mx-auto hidden md:flex h-16 gap-4 items-end rounded-2xl bg-gray-50 dark:bg-neutral-900 px-4 pb-3 border border-gray-200 dark:border-neutral-800/50",
        className
      )}
    >
      {items.map((item) => (
        <IconContainer 
          mouseX={mouseX} 
          key={item.title} 
          {...item} 
        />
      ))}
    </motion.div>
  );
};

function IconContainer({
  mouseX,
  title,
  icon,
  href,
  onClick,
}: {
  mouseX: MotionValue;
  title: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);

  const distance = useTransform(mouseX, (val) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    // When mouse is at Infinity (outside dock), return large value so icon stays small
    if (!isFinite(val)) return 300;
    return val - bounds.x - bounds.width / 2;
  });

  // Wider range for edge icons to still get animation
  const widthTransform = useTransform(distance, [-200, -100, 0, 100, 200], [40, 60, 80, 60, 40]);
  const heightTransform = useTransform(distance, [-200, -100, 0, 100, 200], [40, 60, 80, 60, 40]);
  const widthTransformIcon = useTransform(distance, [-200, -100, 0, 100, 200], [20, 30, 40, 30, 20]);
  const heightTransformIcon = useTransform(distance, [-200, -100, 0, 100, 200], [20, 30, 40, 30, 20]);

  const width = useSpring(widthTransform, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });
  const height = useSpring(heightTransform, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });
  const widthIcon = useSpring(widthTransformIcon, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });
  const heightIcon = useSpring(heightTransformIcon, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  const content = (
    <motion.div
      ref={ref}
      style={{ width, height }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="aspect-square rounded-full bg-gray-200 dark:bg-black flex items-center justify-center relative border border-gray-200 dark:border-neutral-800"
    >
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 10, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 2, x: "-50%" }}
            className="px-2 py-0.5 whitespace-pre rounded-md bg-neutral-800/90 border border-neutral-700 text-neutral-200 absolute left-1/2 -translate-x-1/2 -top-8 w-fit text-xs z-50 pointer-events-none backdrop-blur-sm"
          >
            {title}
          </motion.div>
        )}
      </AnimatePresence>
      <motion.div
        style={{ width: widthIcon, height: heightIcon }}
        className="flex items-center justify-center"
      >
        {icon}
      </motion.div>
    </motion.div>
  );

  if (href) {
    return (
      <Link href={href}>
        {content}
      </Link>
    );
  }

  return (
    <button 
      onClick={onClick} 
      className="bg-transparent border-none cursor-pointer outline-none"
      type="button"
    >
      {content}
    </button>
  );
}
