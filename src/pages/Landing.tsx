import React from "react";
import "./Landing.css";
import SloppyContainer, { randomSeed } from "../components/ui/SloppyContainer";

export default function Landing() {
  const [test, setTest] = React.useState(randomSeed());

  // Change seed every second
  React.useEffect(() => {
    const interval = setInterval(() => {
      setTest(randomSeed());
    }, 750);

    return () => clearInterval(interval);
  }, []);

  return (
    <main id="landing-page" className="font-fuzzy-bubbles">
      <div className="temp-container">
        <SloppyContainer
          containerClassName="test-slopper"
          className="test-slopper-child"
          sloppiness={4}
          waviness={2}
          borderRadius={25}
        >
          <p>test</p>
        </SloppyContainer>
        <SloppyContainer
          containerClassName="test-slopper"
          className="test-slopper-child"
          sloppiness={4}
          waviness={2}
          borderRadius={25}
          asChild
        >
          <a href="/">test as link</a>
        </SloppyContainer>
      </div>
    </main>
  );
}
