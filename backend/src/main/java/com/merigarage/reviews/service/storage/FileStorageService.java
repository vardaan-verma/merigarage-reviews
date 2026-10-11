package com.merigarage.reviews.service.storage;

import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

public interface FileStorageService {

    String storePhoto(MultipartFile file, Long garageId);

    String storeDocument(MultipartFile file, Long garageId);

    Resource loadAsResource(String storageKey);

    void delete(String storageKey);
}
