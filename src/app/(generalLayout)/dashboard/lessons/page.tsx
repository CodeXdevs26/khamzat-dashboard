import AContainer from "@/components/AContainer";
import { Metadata } from "next";
import LessonsContainer from "./_components/LessonsContainer";
import PageTitle from "@/components/others/PageTitle";

export const metadata: Metadata = {
  title: "Lessons",
};

const LessonsPage = () => {
  return (
    <main>
      <AContainer>
         <PageTitle
          title="Lessons Overview"
          subTitle="Create and manage sentence and dialogue lessons within each chapter."
        />
        <LessonsContainer />
      </AContainer>
    </main>
  );
};

export default LessonsPage;
