/* FRAME World image library
 * Keep image rights metadata beside every asset. Only approved records are returned.
 * This file is intentionally standalone until the World page integration is reviewed.
 */
(function (global) {
  "use strict";

  const library = {
    schemaVersion: 1,
    items: []
  };

  const REQUIRED = [
    "id", "entityType", "entityId", "role", "assetUrl", "sourcePageUrl",
    "sourceName", "title", "creator", "licenseName", "licenseUrl", "attribution", "alt",
    "verifiedAt", "status"
  ];

  function isHttpUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === "https:" || url.protocol === "http:";
    } catch (_) {
      return false;
    }
  }

  function validateRecord(record) {
    const errors = [];
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      return { valid: false, errors: ["Record must be an object."] };
    }

    REQUIRED.forEach(function (field) {
      if (typeof record[field] !== "string" || !record[field].trim()) {
        errors.push("Missing required field: " + field);
      }
    });

    if (record.entityType && !["country", "region", "city", "destination", "collection"].includes(record.entityType)) {
      errors.push("Unsupported entityType.");
    }
    if (record.role && !["hero", "card", "gallery", "thumbnail", "map"].includes(record.role)) {
      errors.push("Unsupported image role.");
    }
    if (record.status !== "approved") {
      errors.push("Only approved records may be published.");
    }
    if (record.assetUrl && !/^\//.test(record.assetUrl) && !isHttpUrl(record.assetUrl)) {
      errors.push("assetUrl must be a site-relative path or HTTP(S) URL.");
    }
    if (record.sourcePageUrl && !isHttpUrl(record.sourcePageUrl)) {
      errors.push("sourcePageUrl must be an HTTP(S) URL.");
    }
    if (record.licenseUrl && !isHttpUrl(record.licenseUrl)) {
      errors.push("licenseUrl must be an HTTP(S) URL.");
    }
    if (record.verifiedAt && !/^\d{4}-\d{2}-\d{2}$/.test(record.verifiedAt)) {
      errors.push("verifiedAt must use YYYY-MM-DD.");
    }
    if (record.width != null && (!Number.isInteger(record.width) || record.width < 1)) {
      errors.push("width must be a positive integer.");
    }
    if (record.height != null && (!Number.isInteger(record.height) || record.height < 1)) {
      errors.push("height must be a positive integer.");
    }
    if (record.focalPoint != null) {
      ["x", "y"].forEach(function (axis) {
        if (typeof record.focalPoint[axis] !== "number" || record.focalPoint[axis] < 0 || record.focalPoint[axis] > 100) {
          errors.push("focalPoint " + axis + " must be between 0 and 100.");
        }
      });
    }
    return { valid: errors.length === 0, errors: errors };
  }

  function approvedFor(entityType, entityId, role) {
    return library.items.filter(function (item) {
      return item.status === "approved" &&
        item.entityType === entityType &&
        item.entityId === entityId &&
        (!role || item.role === role) &&
        validateRecord(item).valid;
    });
  }

  function firstApproved(entityType, entityId, role) {
    return approvedFor(entityType, entityId, role)[0] || null;
  }

  global.FRAME_WORLD_IMAGES = Object.freeze({
    schemaVersion: library.schemaVersion,
    items: library.items,
    validateRecord: validateRecord,
    approvedFor: approvedFor,
    firstApproved: firstApproved
  });
})(window);
