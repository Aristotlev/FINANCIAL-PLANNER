/**
 * Note: Use position fixed according to your needs
 * Desktop navbar is better positioned at the bottom
 * Mobile navbar is better positioned at bottom right.
 **/

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
import { PanelBottomClose } from "lucide-react";

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
      {/* Horizontal scrollable container */}
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
  let mouseX = useMotionValue(Infinity);

  return (
    <motion.div
      onMouseMove={(e) => mouseX.set(e.pageX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className={cn(
        "mx-auto flex h-16 gap-4 items-end rounded-2xl bg-gray-50 dark:bg-neutral-900 px-4 pb-3 border border-gray-200 dark:border-neutral-800/50",
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
  let ref = useRef<HTMLDivElement>(null);

  let distance = useTransform(mouseX, (val) => {
    let bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  let widthTransform = useTransform(distance, [-150, 0, 150], [40, 80, 40]);
  let heightTransform = useTransform(distance, [-150, 0, 150], [40, 80, 40]);

  let widthTransformIcon = useTransform(distance, [-150, 0, 150], [20, 40, 20]);
  let heightTransformIcon = useTransform(distance, [-150, 0, 150], [20, 40, 20]);

  // Higher damping = less bounce, higher stiffness = faster response
  let width = useSpring(widthTransform, {
    mass: 0.1,
    stiffness: 200,
    damping: 25,
  });
  let height = useSpring(heightTransform, {
    mass: 0.1,
    stiffness: 200,
    damping: 25,
  });

  let widthIcon = useSpring(widthTransformIcon, {
    mass: 0.1,
    stiffness: 200,
    damping: 25,
  });
  let heightIcon = useSpring(heightTransformIcon, {
    mass: 0.1,
    stiffness: 200,
    damping: 25,
  });

  const [hovered, setHovered] = useState(false);

  const content = (
      <motion.div
        ref={ref}
        style={{ width, height }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="aspect-square rounded-full bg-gray-200 dark:bg-black flex items-center justify-center relative border border-gray-200 dark:border-neutral-800"
        // Prevent layout animations from interfering with size animations
        layout={false}
      >
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0, y: 10, x: "-50%" }}
              animate={{ opacity: 1, y: 0, x: "-50%" }}
              exit={{ opacity: 0, y: 2, x: "-50%" }}
              className="px-2 py-0.5 whitespace-pre rounded-md bg-gray-100 border dark:bg-black dark:border-neutral-800 dark:text-white border-gray-200 text-neutral-700 absolute left-1/2 -translate-x-1/2 -top-8 w-fit text-xs z-50 pointer-events-none"
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

  // Wrap in a stable container that doesn't animate
  const handleClick = (e: React.MouseEvent) => {
    // Prevent the click from bubbling and causing layout recalculations
    e.preventDefault();
    if (onClick) {
      // Use setTimeout to delay the state change until after animations settle
      setTimeout(() => onClick(), 0);
    }
  };

  if (href) {
      return (
        <Link href={href}>
            {content}
        </Link>
      )
  }

  return (
    <button 
      onClick={handleClick} 
      className="bg-transparent border-none cursor-pointer outline-none"
      type="button"
    >
      {content}
    </button>
  );
}

// Fallback icon since we are not using tabler
function IconLayoutNavbarCollapse(props: any) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <path d="M9 3v18" />
        </svg>
    )
}
