import AContainer from "@/components/AContainer";
import { Metadata } from "next";
import ChaptersContainer from "./_components/ChaptersContainer";
import PageTitle from "@/components/others/PageTitle";

export const metadata: Metadata = {
  title: "Chapters",
};

const ChaptersPage = () => {
  return (
    <main>
      <AContainer>
        <PageTitle
          title="Chapters Overview"
          subTitle="Create and manage chapters within each level, set their order, and add notes."
        />
        <ChaptersContainer />
      </AContainer>
    </main>
  );
};

export default ChaptersPage;
