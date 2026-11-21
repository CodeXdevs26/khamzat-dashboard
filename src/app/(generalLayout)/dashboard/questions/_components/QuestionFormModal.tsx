"use client";

import { skipToken } from "@reduxjs/toolkit/query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useGetChaptersQuery } from "@/redux/api/chaptersApi";
import { useGetLessonsQuery } from "@/redux/api/lessonsApi";

export interface QuestionFormValues {
  levelId?: string;
  chapterId: string;
  lessonId: string;
  index: number;
  sentenceInEnglish?: string;
  sentenceInLearningLanguage?: string;
  hint?: string;
  fullSentence?: string;
  missingWord?: string;
  audio?: File;
  audioUrl?: string | null;
}

interface QuestionFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: QuestionFormValues) => void | Promise<void>;
  defaultValues?: QuestionFormValues;
  title: string;
  description: string;
  submitLabel: string;
  levelOptions: { label: string; value: string }[];
}

type FormOption = {
  label: string;
  value: string;
};

type ChapterApiItem = {
  id: string;
  name: string;
};

type LessonApiItem = {
  id: string;
  index: number;
  lessonType: "DIALOGUE" | "SENTENCE";
};

const emptyValues: QuestionFormValues = {
  levelId: "",
  chapterId: "",
  lessonId: "",
  index: 1,
  sentenceInEnglish: "",
  sentenceInLearningLanguage: "",
  hint: "",
  fullSentence: "",
  missingWord: "",
  audio: undefined,
};

const QuestionFormModal = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
  title,
  description,
  submitLabel,
  levelOptions,
}: QuestionFormModalProps) => {
  const [values, setValues] = useState<QuestionFormValues>(emptyValues);
  const [selectedAudioUrl, setSelectedAudioUrl] = useState<string>();
  // currentData (not data): data keeps the previous level's result while the
  // new one loads, which made the effects below reset the chosen chapter.
  const { currentData: chaptersData } = useGetChaptersQuery(values.levelId);
  const chapters = useMemo<ChapterApiItem[]>(
    () => chaptersData?.data || [],
    [chaptersData],
  );

  const chapterOptions = useMemo(
    () =>
      chapters.map((chapter) => ({
        label: chapter.name,
        value: chapter.id,
      })),
    [chapters],
  );

  const { currentData: lessonsData } = useGetLessonsQuery(
    values.chapterId ? values.chapterId : skipToken,
  );
  const chapterLessons = useMemo<LessonApiItem[]>(
    () => (values.chapterId ? lessonsData?.data || [] : []),
    [lessonsData, values.chapterId],
  );
  const selectedLesson = chapterLessons.find(
    (lesson) => lesson.id === values.lessonId,
  );
  const selectedLessonType = selectedLesson?.lessonType as
    | "DIALOGUE"
    | "SENTENCE"
    | undefined;

  // Reset only when the modal opens. The parent passes a new defaultValues
  // object on every render, so reacting to it would wipe what the user typed.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) {
      setValues(defaultValues ?? emptyValues);
    }
    wasOpen.current = open;
  }, [defaultValues, open]);

  useEffect(() => {
    if (!values.audio) {
      setSelectedAudioUrl(undefined);
      return;
    }

    const audioUrl = URL.createObjectURL(values.audio);
    setSelectedAudioUrl(audioUrl);

    return () => URL.revokeObjectURL(audioUrl);
  }, [values.audio]);

  useEffect(() => {
    // Don't pick a default level when a chapter is already set (editing),
    // otherwise the question's chapter would be replaced.
    // Check prev too: on open this runs in the same commit as the reset above,
    // so `values` is still the empty state while prev already holds the
    // question's defaults; overwriting it moved the question to level 1.
    if (!values.levelId && !values.chapterId && levelOptions.length) {
      setValues((prev) =>
        prev.levelId || prev.chapterId
          ? prev
          : { ...prev, levelId: levelOptions[0].value },
      );
    }
  }, [levelOptions, values.levelId, values.chapterId]);

  useEffect(() => {
    // Wait until chapters for the current level have loaded.
    if (!values.levelId || !chaptersData) return;

    // Only correct the state this check was based on. If the modal was just
    // reset to new defaults in the same commit, prev differs: leave it alone.
    const fixChapter = (chapterId: string) =>
      setValues((prev) =>
        prev.levelId !== values.levelId || prev.chapterId !== values.chapterId
          ? prev
          : { ...prev, chapterId, lessonId: "" },
      );

    if (!chapterOptions.length) {
      if (values.chapterId || values.lessonId) fixChapter("");
      return;
    }

    const hasSelectedChapter = chapterOptions.some(
      (chapter: FormOption) => chapter.value === values.chapterId,
    );

    if (!hasSelectedChapter) fixChapter(chapterOptions[0].value);
  }, [
    chaptersData,
    chapterOptions,
    values.chapterId,
    values.lessonId,
    values.levelId,
  ]);

  const filteredLessonOptions = useMemo(() => {
    return chapterLessons
      .map((lesson) => ({
        label: `${lesson.lessonType} ${lesson.index}`,
        value: lesson.id,
      }));
  }, [chapterLessons]);

  useEffect(() => {
    // Same guard as the chapter effect: skip if prev was reset meanwhile.
    const fixLesson = (lessonId: string) =>
      setValues((prev) =>
        prev.chapterId !== values.chapterId || prev.lessonId !== values.lessonId
          ? prev
          : { ...prev, lessonId },
      );

    if (!values.chapterId) {
      if (values.lessonId) fixLesson("");
      return;
    }

    // Wait until lessons for the current chapter have loaded.
    if (!lessonsData) return;

    if (!filteredLessonOptions.length) {
      if (values.lessonId) fixLesson("");
      return;
    }

    const hasSelectedLesson = filteredLessonOptions.some(
      (lesson: FormOption) => lesson.value === values.lessonId,
    );

    if (!hasSelectedLesson) fixLesson(filteredLessonOptions[0].value);
  }, [lessonsData, filteredLessonOptions, values.chapterId, values.lessonId]);

  const handleFieldChange = (
    key: keyof QuestionFormValues,
    value: QuestionFormValues[keyof QuestionFormValues],
  ) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleChapterChange = (value: string) => {
    setValues((prev) => ({
      ...prev,
      chapterId: value,
      lessonId: "",
    }));
  };

  const handleLevelChange = (value: string) => {
    setValues((prev) => ({
      ...prev,
      levelId: value,
      chapterId: "",
      lessonId: "",
    }));
  };

  const handleSubmit = async () => {
    if (!values.levelId) {
      toast.error("Level is required");
      return;
    }

    if (!values.chapterId) {
      toast.error("Chapter is required");
      return;
    }

    if (!values.lessonId) {
      toast.error("Lesson is required");
      return;
    }

    if (!values.index || values.index < 1) {
      toast.error("Valid index is required");
      return;
    }

    if (selectedLessonType === "SENTENCE") {
      if (!values.sentenceInEnglish?.trim()) {
        toast.error("English sentence is required");
        return;
      }
      if (!values.sentenceInLearningLanguage?.trim()) {
        toast.error("Learning language sentence is required");
        return;
      }
      if (!values.hint?.trim()) {
        toast.error("Hint is required");
        return;
      }
    }

    if (selectedLessonType === "DIALOGUE") {
      if (!values.fullSentence?.trim()) {
        toast.error("Full sentence is required");
        return;
      }
      if (!values.missingWord?.trim()) {
        toast.error("Missing word is required");
        return;
      }
    }

    await onSubmit({
      ...values,
      sentenceInEnglish: values.sentenceInEnglish?.trim() || undefined,
      sentenceInLearningLanguage:
        values.sentenceInLearningLanguage?.trim() || undefined,
      hint: values.hint?.trim() || undefined,
      fullSentence: values.fullSentence?.trim() || undefined,
      missingWord: values.missingWord?.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[720px] rounded-[22px] border-border bg-card px-8 py-8 sm:px-10"
      >
        <DialogHeader className="items-center text-center">
          <DialogTitle className="text-[30px] font-bold text-white">
            {title}
          </DialogTitle>
          <DialogDescription className="mt-1 text-base text-card-foreground">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <label className="text-sm font-medium text-white">Index</label>
              <Input
                type="number"
                min="1"
                value={values.index}
                onChange={(event) =>
                  handleFieldChange("index", Number(event.target.value))
                }
                className="h-12 rounded-2xl border-border bg-transparent px-5 text-white"
              />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-white">
                Lesson Type
              </label>
              <div className="flex h-12 items-center rounded-2xl border border-border bg-transparent px-5 text-sm text-white">
                {selectedLessonType || "Select lesson first"}
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <label className="text-sm font-medium text-white">Level</label>
              <Select value={values.levelId} onValueChange={handleLevelChange}>
                <SelectTrigger className="h-12! w-full rounded-2xl border-border bg-transparent px-5 text-white">
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent className="border-border bg-card text-white">
                  {levelOptions.map((level: FormOption) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-white">Chapter</label>
              <Select
                value={values.chapterId}
                onValueChange={handleChapterChange}
              >
                <SelectTrigger className="h-12! w-full rounded-2xl border-border bg-transparent px-5 text-white">
                  <SelectValue placeholder="Select chapter" />
                </SelectTrigger>
                <SelectContent className="border-border bg-card text-white">
                  {chapterOptions.length ? (
                    chapterOptions.map((chapter: FormOption) => (
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
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-white">Lesson</label>
            <Select
              value={values.lessonId}
              onValueChange={(value) => handleFieldChange("lessonId", value)}
            >
              <SelectTrigger className="h-12! w-full rounded-2xl border-border bg-transparent px-5 text-white">
                <SelectValue placeholder="Select lesson" />
              </SelectTrigger>
              <SelectContent className="border-border bg-card text-white">
                {filteredLessonOptions.length ? (
                  filteredLessonOptions.map((lesson: FormOption) => (
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
          </div>

          {selectedLessonType === "SENTENCE" ? (
            <>
              <div className="space-y-3">
                <label className="text-sm font-medium text-white">
                  Sentence in English
                </label>
                <Input
                  value={values.sentenceInEnglish || ""}
                  onChange={(event) =>
                    handleFieldChange("sentenceInEnglish", event.target.value)
                  }
                  className="h-12 rounded-2xl border-border bg-transparent px-5 text-white"
                />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-medium text-white">
                  Sentence in Learning Language
                </label>
                <Input
                  value={values.sentenceInLearningLanguage || ""}
                  onChange={(event) =>
                    handleFieldChange(
                      "sentenceInLearningLanguage",
                      event.target.value,
                    )
                  }
                  className="h-12 rounded-2xl border-border bg-transparent px-5 text-white"
                />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-medium text-white">Hint</label>
                <Input
                  value={values.hint || ""}
                  onChange={(event) =>
                    handleFieldChange("hint", event.target.value)
                  }
                  className="h-12 rounded-2xl border-border bg-transparent px-5 text-white"
                />
              </div>
            </>
          ) : selectedLessonType === "DIALOGUE" ? (
            <>
              <div className="space-y-3">
                <label className="text-sm font-medium text-white">
                  Full Sentence
                </label>
                <Input
                  value={values.fullSentence || ""}
                  onChange={(event) =>
                    handleFieldChange("fullSentence", event.target.value)
                  }
                  className="h-12 rounded-2xl border-border bg-transparent px-5 text-white"
                />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-medium text-white">
                  Missing Word
                </label>
                <Input
                  value={values.missingWord || ""}
                  onChange={(event) =>
                    handleFieldChange("missingWord", event.target.value)
                  }
                  className="h-12 rounded-2xl border-border bg-transparent px-5 text-white"
                />
              </div>
            </>
          ) : null}

          <div className="space-y-3">
            <label className="text-sm font-medium text-white">Audio</label>
            <Input
              key={open ? "open" : "closed"}
              type="file"
              accept="audio/*"
              onChange={(event) =>
                handleFieldChange("audio", event.target.files?.[0])
              }
              className="h-12 rounded-2xl border-border bg-transparent px-5 text-white"
            />
            {selectedAudioUrl || values.audioUrl ? (
              <audio
                className="w-full"
                controls
                preload="none"
                src={selectedAudioUrl || values.audioUrl || undefined}
                aria-label="Question audio"
              />
            ) : null}
          </div>

          <Button
            type="button"
            onClick={handleSubmit}
            className="h-12 w-full rounded-2xl text-base"
          >
            {submitLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuestionFormModal;
