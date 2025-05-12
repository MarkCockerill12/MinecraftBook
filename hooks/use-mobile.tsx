import * as React from "react"

const MOBILE_WIDTH = 500;
const MOBILE_HEIGHT = 900;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    function checkMobile() {
      setIsMobile(window.innerWidth < MOBILE_WIDTH && window.innerHeight < MOBILE_HEIGHT);
    }
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [])

  return !!isMobile;
}
