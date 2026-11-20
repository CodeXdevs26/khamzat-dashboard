import AContainer from "@/components/AContainer";
import { Metadata } from "next";
import LevelsContainer from "./_components/LevelsContainer";
import PageTitle from "@/components/others/PageTitle";

export const metadata: Metadata = {
  title: "Levels",
};

const LevelsPage = () => {
  return (
    <main>
      <AContainer>
        <PageTitle
          title="Levels Overview"
          subTitle="Create and manage learning levels, set their order, and upload a cover image for each level."
        />
        <LevelsContainer />
      </AContainer>
    </main>
  );
};

export default LevelsPage;
