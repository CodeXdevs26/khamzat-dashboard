"use client";

import { skipToken } from "@reduxjs/toolkit/query";
import { useEffect, useMemo, useState } from "react";
import { APagination } from "@/components/ui/APagination";
import AErrorMessage from "@/components/AErrorMessage";
import ASpinner from "@/components/ui/ASpinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Plus } from "lucide-react";
import handleMutation from "@/utils/handleMutation";
import { useGetChaptersQuery } from "@/redux/api/chaptersApi";
import { useGetLessonsQuery } from "@/redux/api/lessonsApi";
import { useGetLevelsQuery } from "@/redux/api/levelsApi";
import {
  useCreateQuestionMutation,
  useDeleteQuestionMutation,
  useGetQuestionsQuery,
  useUpdateQuestionMutation,
} from "@/redux/api/questionsApi";
import QuestionCard, { QuestionItem } from "./QuestionCard";
import QuestionFormModal, { QuestionFormValues } from "./QuestionFormModal";

type LevelApiItem = {
  id: string;
  name: string;
};

type ChapterApiItem = {
  id: string;
  name: string;
  levelId: string;
};

type LessonApiItem = {
  id: string;
  index: number;
  lessonType: string;
  chapterId: string;
};

const ALL = "all";
const PAGE_LIMIT = 10;

const QuestionsContainer = () => {
  const [searchTerm, setSearchTerm] = useState("");
  // Level is "all" or a level id. Chapter and lesson are "" (none) or an id.
  // The backend can only filter questions by lesson, so picking a level
  // narrows down to one lesson; "All levels" lists every question.
  const [selectedLevel, setSelectedLevel] = useState(ALL);
  const [selectedChapter, setSelectedChapter] = useState("");
  const [selectedLesson, setSelectedLesson] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionItem | null>(
    null,
  );

  const { data: levelsData } = useGetLevelsQuery(undefined);
  const levels = useMemo<LevelApiItem[]>(() => levelsData?.data || [], [levelsData]);

  const { data: allChaptersData } = useGetChaptersQuery(undefined);
  const allChapters = useMemo<ChapterApiItem[]>(
    () => allChaptersData?.data || [],
    [allChaptersData],
  );
  const chapters = useMemo(
    () =>
      selectedLevel === ALL
        ? []
        : allChapters.filter((chapter) => chapter.levelId === selectedLevel),
    [allChapters, selectedLevel],
  );

  const { currentData: lessonsData } = useGetLessonsQuery(
    selectedChapter ? selectedChapter : skipToken,
  );
  const lessons = useMemo<LessonApiItem[]>(
    () => (selectedChapter ? lessonsData?.data || [] : []),
    [lessonsData, selectedChapter],
  );

  // Select the chapter's first lesson once its lessons have loaded.
  useEffect(() => {
    if (!selectedChapter || !lessonsData) return;
    if (!lessons.some((lesson) => lesson.id === selectedLesson)) {
      setSelectedLesson(lessons[0]?.id ?? "");
      setCurrentPage(1);
    }
  }, [lessons, lessonsData, selectedChapter, selectedLesson]);

  const questionsArgs =
    selectedLevel === ALL
      ? { page: currentPage, limit: PAGE_LIMIT }
      : selectedLesson
        ? { page: currentPage, limit: PAGE_LIMIT, lessonId: selectedLesson }
        : skipToken;
  const {
    currentData,
    isFetching,
    isError,
    error,
    refetch,
  } = useGetQuestionsQuery(questionsArgs);
  const totalQuestions: number = currentData?.data?.meta?.total ?? 0;

  // Still working out which lesson to show for the chosen level/chapter.
  const isResolvingLesson =
    selectedLevel !== ALL && !!selectedChapter && !lessonsData;

  // Step back a page if the current one became empty (e.g. after a delete).
  useEffect(() => {
    if (currentPage > 1 && currentData && totalQuestions > 0) {
      const lastPage = Math.ceil(totalQuestions / PAGE_LIMIT);
      if (currentPage > lastPage) setCurrentPage(lastPage);
    }
  }, [currentData, currentPage, totalQuestions]);

  const [createQuestion, { isLoading: isCreating }] =
    useCreateQuestionMutation();
  const [updateQuestion, { isLoading: isUpdating }] =
    useUpdateQuestionMutation();
  const [deleteQuestion] = useDeleteQuestionMutation();

  const questions = useMemo<QuestionItem[]>(
    () => currentData?.data?.questions || [],
    [currentData],
  );

  const levelOptions = useMemo(
    () =>
      levels.map((level) => ({
        label: level.name,
        value: level.id,
      })),
    [levels],
  );

  const chapterOptions = useMemo(
    () =>
      chapters.map((chapter) => ({
        label: chapter.name,
        value: chapter.id,
      })),
    [chapters],
  );

  const lessonOptions = useMemo(
    () =>
      lessons.map((lesson) => ({
        label: `${lesson.lessonType} ${lesson.index}`,
        value: lesson.id,
        chapterId: lesson.chapterId,
        lessonType: lesson.lessonType,
      })),
    [lessons],
  );

  // Level/chapter/lesson filtering happens on the backend (lessonId).
  // The backend has no search param, so search only covers the current page.
  const filteredQuestions = useMemo(() => {
    const term = searchTerm.toLowerCase();
    if (!term) return questions;
    return questions.filter(
      (question) =>
        question.type?.toLowerCase().includes(term) ||
        question.sentenceInEnglish?.toLowerCase().includes(term) ||
        question.fullSentence?.toLowerCase().includes(term),
    );
  }, [questions, searchTerm]);

  const handleLevelChange = (value: string) => {
    setSelectedLevel(value);
    setSelectedChapter(
      value === ALL
        ? ""
        : (allChapters.find((chapter) => chapter.levelId === value)?.id ?? ""),
    );
    setSelectedLesson("");
    setCurrentPage(1);
  };

  const handleChapterChange = (value: string) => {
    setSelectedChapter(value);
    setSelectedLesson("");
    setCurrentPage(1);
  };

  const handleLessonChange = (value: string) => {
    setSelectedLesson(value);
    setCurrentPage(1);
  };

  const buildQuestionFormData = (values: QuestionFormValues) => {
    const formData = new FormData();
    formData.append(
      "payload",
      JSON.stringify({
        chapterId: values.chapterId,
        lessonId: values.lessonId,
        index: values.index,
        sentenceInEnglish: values.sentenceInEnglish,
        sentenceInLearningLanguage: values.sentenceInLearningLanguage,
        hint: values.hint,
        fullSentence: values.fullSentence,
        missingWord: values.missingWord,
      }),
    );

    if (values.audio) {
      formData.append("audio", values.audio);
    }

    return formData;
  };

  const handleCreateQuestion = async (values: QuestionFormValues) => {
    await handleMutation(
      buildQuestionFormData(values),
      createQuestion,
      "Creating question...",
      () => {
        setIsCreateOpen(false);
      },
    );
  };

  const handleEditQuestion = async (values: QuestionFormValues) => {
    if (!editingQuestion) return;

    await handleMutation(
      { id: editingQuestion.id, data: buildQuestionFormData(values) },
      updateQuestion,
      "Updating question...",
      () => {
        setEditingQuestion(null);
      },
    );
  };

  const handleDeleteQuestion = async (question: QuestionItem) => {
    await handleMutation(question.id, deleteQuestion, "Deleting question...");
  };

  return (
    <>
      <div className="space-y-10 pt-8">
        <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative w-full max-w-md">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Type to search"
              className="h-12 rounded-xl border-border bg-card pl-12 text-white"
            />
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap xl:flex-nowrap">
            <Select
              value={selectedLevel}
              onValueChange={handleLevelChange}
            >
              <SelectTrigger className="h-12! min-w-30 rounded-xl border-border bg-transparent px-4 text-white">
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent className="border-border bg-card text-white">
                <SelectItem value={ALL}>All levels</SelectItem>
                {levelOptions.map((level: { label: string; value: string }) => (
                  <SelectItem key={level.value} value={level.value}>
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedChapter}
              onValueChange={handleChapterChange}
              disabled={selectedLevel === ALL}
            >
              <SelectTrigger className="h-12! min-w-35 rounded-xl border-border bg-transparent px-4 text-white">
                <SelectValue placeholder="Chapter" />
              </SelectTrigger>
              <SelectContent className="border-border bg-card text-white">
                {chapterOptions.length ? (
                  chapterOptions.map((chapter: { label: string; value: string }) => (
                    <SelectItem key={chapter.value} value={chapter.value}>
                      {chapter.label}
                    </SelectItem>
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm text-card-foreground">
                    No chapters found
                  </div>
                )}
              </SelectContent>
            </Select>

            <Select
              value={selectedLesson}
              onValueChange={handleLessonChange}
              disabled={!selectedChapter}
            >
              <SelectTrigger className="h-12! min-w-35 rounded-xl border-border bg-transparent px-4 text-white">
                <SelectValue placeholder="Lesson" />
              </SelectTrigger>
              <SelectContent className="border-border bg-card text-white">
                {lessonOptions.length ? (
                  lessonOptions.map((lesson: { label: string; value: string }) => (
                    <SelectItem key={lesson.value} value={lesson.value}>
                      {lesson.label}
                    </SelectItem>
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm text-card-foreground">
                    No lessons found
                  </div>
                )}
              </SelectContent>
            </Select>
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="h-12 rounded-xl px-5 text-sm"
            >
              Add new question
              <Plus className="size-4" />
            </Button>
          </div>
        </div>

        {(isFetching && !currentData) || isResolvingLesson ? (
          <ASpinner size={120} className="min-h-[320px]" />
        ) : isError ? (
          <AErrorMessage
            error={error}
            onRetry={refetch}
            className="min-h-[320px]"
          />
        ) : filteredQuestions.length ? (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {filteredQuestions.map((question) => (
              <QuestionCard
                key={question.id}
                question={question}
                onEdit={setEditingQuestion}
                onDelete={handleDeleteQuestion}
              />
            ))}
          </div>
        ) : (
          <div className="flex min-h-[320px] items-center justify-center rounded-[28px] border border-dashed border-border bg-card/40 text-center">
            <div className="space-y-2">
              <h3 className="text-2xl font-semibold text-white">
                No questions found
              </h3>
              <p className="text-card-foreground">
                Try another filter or create a new question.
              </p>
            </div>
          </div>
        )}

        {totalQuestions > PAGE_LIMIT && (
          <APagination
            totalItems={totalQuestions}
            itemsPerPage={PAGE_LIMIT}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
          />
        )}
      </div>

      <QuestionFormModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={handleCreateQuestion}
        defaultValues={{
          levelId: selectedLevel === ALL ? "" : selectedLevel,
          chapterId: selectedChapter,
          lessonId: selectedLesson,
          index: 1,
          sentenceInEnglish: "",
          sentenceInLearningLanguage: "",
          hint: "",
          fullSentence: "",
          missingWord: "",
          audio: undefined,
        }}
        title="Add New Question"
        description="Create a sentence or dialogue question"
        submitLabel={isCreating ? "Submitting..." : "Submit"}
        levelOptions={levelOptions}
      />

      <QuestionFormModal
        key={editingQuestion?.id ?? "edit-question"}
        open={!!editingQuestion}
        onOpenChange={(open) => {
          if (!open) setEditingQuestion(null);
        }}
        onSubmit={handleEditQuestion}
        defaultValues={
          editingQuestion
            ? {
                levelId:
                  allChapters.find(
                    (chapter) => chapter.id === editingQuestion.chapterId,
                  )?.levelId ?? "",
                chapterId: editingQuestion.chapterId,
                lessonId: editingQuestion.lessonId,
                index: editingQuestion.index,
                sentenceInEnglish: editingQuestion.sentenceInEnglish || "",
                sentenceInLearningLanguage:
                  editingQuestion.sentenceInLearningLanguage || "",
                hint: editingQuestion.hint || "",
                fullSentence: editingQuestion.fullSentence || "",
                missingWord: editingQuestion.missingWord || "",
                audioUrl: editingQuestion.audio,
              }
            : undefined
        }
        title="Update Question"
        description="Update question details"
        submitLabel={isUpdating ? "Updating..." : "Update"}
        levelOptions={levelOptions}
      />
    </>
  );
};

export default QuestionsContainer;
