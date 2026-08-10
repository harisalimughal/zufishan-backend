import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getResourcesByCourse,
  getResourceById,
  createResource,
  updateResource,
  deleteResource,
} from "../src/services/courseResource.service";
import { courseRepository } from "../src/repositories/course.repository";
import { courseResourceRepository } from "../src/repositories/courseResource.repository";
import { ApiError } from "../src/utils/apiError";

vi.mock("../src/repositories/course.repository", () => ({
  courseRepository: {
    findById: vi.fn(),
  },
}));

vi.mock("../src/repositories/courseResource.repository", () => ({
  courseResourceRepository: {
    findAllByCourseId: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("CourseResource Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getResourcesByCourse", () => {
    it("should return resources when course exists", async () => {
      const mockCourse = { id: "course-1", title: "DB 101" };
      const mockResources = [{ id: "res-1", title: "Guide.pdf", fileUrl: "http://example.com/guide.pdf" }];

      vi.mocked(courseRepository.findById).mockResolvedValue(mockCourse as any);
      vi.mocked(courseResourceRepository.findAllByCourseId).mockResolvedValue(mockResources as any);

      const result = await getResourcesByCourse("course-1");

      expect(courseRepository.findById).toHaveBeenCalledWith("course-1");
      expect(courseResourceRepository.findAllByCourseId).toHaveBeenCalledWith("course-1");
      expect(result).toEqual(mockResources);
    });

    it("should throw 404 ApiError when course is not found", async () => {
      vi.mocked(courseRepository.findById).mockResolvedValue(null);

      await expect(getResourcesByCourse("nonexistent")).rejects.toThrow(ApiError);
      await expect(getResourcesByCourse("nonexistent")).rejects.toThrow("Course not found");
    });
  });

  describe("getResourceById", () => {
    it("should return resource when it exists", async () => {
      const mockResource = { id: "res-1", title: "Guide.pdf" };
      vi.mocked(courseResourceRepository.findById).mockResolvedValue(mockResource as any);

      const result = await getResourceById("res-1");

      expect(courseResourceRepository.findById).toHaveBeenCalledWith("res-1");
      expect(result).toEqual(mockResource);
    });

    it("should throw 404 ApiError when resource is not found", async () => {
      vi.mocked(courseResourceRepository.findById).mockResolvedValue(null);

      await expect(getResourceById("nonexistent")).rejects.toThrow(ApiError);
      await expect(getResourceById("nonexistent")).rejects.toThrow("Course resource not found");
    });
  });

  describe("createResource", () => {
    it("should create resource when course exists", async () => {
      const mockCourse = { id: "course-1", title: "DB 101" };
      const input = { title: "CheatSheet.pdf", fileUrl: "http://example.com/sheet.pdf" };
      const mockCreated = { id: "res-2", ...input, fileType: "pdf", courseId: "course-1" };

      vi.mocked(courseRepository.findById).mockResolvedValue(mockCourse as any);
      vi.mocked(courseResourceRepository.create).mockResolvedValue(mockCreated as any);

      const result = await createResource("course-1", input);

      expect(courseRepository.findById).toHaveBeenCalledWith("course-1");
      expect(courseResourceRepository.create).toHaveBeenCalledWith({
        title: input.title,
        fileUrl: input.fileUrl,
        fileType: "pdf",
        course: { connect: { id: "course-1" } },
      });
      expect(result).toEqual(mockCreated);
    });

    it("should throw 404 ApiError when course does not exist on create", async () => {
      vi.mocked(courseRepository.findById).mockResolvedValue(null);

      await expect(
        createResource("nonexistent", { title: "Sheet.pdf", fileUrl: "http://example.com" })
      ).rejects.toThrow("Course not found");
    });
  });

  describe("updateResource", () => {
    it("should update resource when it exists", async () => {
      const existing = { id: "res-1", title: "Old Title" };
      const updateData = { title: "New Title" };
      const updated = { id: "res-1", title: "New Title" };

      vi.mocked(courseResourceRepository.findById).mockResolvedValue(existing as any);
      vi.mocked(courseResourceRepository.update).mockResolvedValue(updated as any);

      const result = await updateResource("res-1", updateData);

      expect(courseResourceRepository.findById).toHaveBeenCalledWith("res-1");
      expect(courseResourceRepository.update).toHaveBeenCalledWith("res-1", updateData);
      expect(result).toEqual(updated);
    });

    it("should throw 404 ApiError when resource is not found on update", async () => {
      vi.mocked(courseResourceRepository.findById).mockResolvedValue(null);

      await expect(updateResource("nonexistent", { title: "New" })).rejects.toThrow(
        "Course resource not found"
      );
    });
  });

  describe("deleteResource", () => {
    it("should delete resource when it exists", async () => {
      const existing = { id: "res-1", title: "Old Title" };

      vi.mocked(courseResourceRepository.findById).mockResolvedValue(existing as any);
      vi.mocked(courseResourceRepository.delete).mockResolvedValue(existing as any);

      const result = await deleteResource("res-1");

      expect(courseResourceRepository.findById).toHaveBeenCalledWith("res-1");
      expect(courseResourceRepository.delete).toHaveBeenCalledWith("res-1");
      expect(result).toEqual({ message: "Course resource deleted successfully" });
    });

    it("should throw 404 ApiError when resource is not found on delete", async () => {
      vi.mocked(courseResourceRepository.findById).mockResolvedValue(null);

      await expect(deleteResource("nonexistent")).rejects.toThrow(
        "Course resource not found"
      );
    });
  });
});
