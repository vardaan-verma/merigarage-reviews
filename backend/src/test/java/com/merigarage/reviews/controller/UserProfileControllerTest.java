package com.merigarage.reviews.controller;

import com.merigarage.reviews.domain.User;
import com.merigarage.reviews.repository.UserRepository;
import com.merigarage.reviews.service.UserService;
import com.merigarage.reviews.service.dto.RegisterUserRequest;
import com.merigarage.reviews.service.storage.LocalFileStorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class UserProfileControllerTest {

    @Autowired
    private WebApplicationContext webApplicationContext;

    private MockMvc mockMvc;

    @Autowired
    private UserService userService;

    @Autowired
    private UserRepository userRepository;

    private static final String PASSWORD = "Password123!";

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .webAppContextSetup(webApplicationContext)
                .apply(springSecurity())
                .build();
    }

    private MockHttpSession login(String email) throws Exception {
        String loginJson = """
                {"email": "%s", "password": "%s"}
                """.formatted(email, PASSWORD);

        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson))
                .andExpect(status().isOk())
                .andReturn();

        return (MockHttpSession) result.getRequest().getSession(false);
    }

    private byte[] createValidImageBytes(String format) {
        try {
            BufferedImage image = new BufferedImage(32, 32, BufferedImage.TYPE_INT_RGB);
            Graphics2D g = image.createGraphics();
            g.setColor(Color.RED);
            g.fillRect(0, 0, 32, 32);
            g.dispose();
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(image, format, baos);
            return baos.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    private byte[] createValidWebpBytes() {
        // RIFF header for WebP: 'R','I','F','F', 4-byte size, 'W','E','B','P', 'V','P','8',' '
        byte[] webp = new byte[32];
        webp[0] = 'R'; webp[1] = 'I'; webp[2] = 'F'; webp[3] = 'F';
        webp[4] = 24; webp[5] = 0; webp[6] = 0; webp[7] = 0;
        webp[8] = 'W'; webp[9] = 'E'; webp[10] = 'B'; webp[11] = 'P';
        webp[12] = 'V'; webp[13] = 'P'; webp[14] = '8'; webp[15] = ' ';
        return webp;
    }

    @Test
    void getProfile_Anonymous_Returns401() throws Exception {
        mockMvc.perform(get("/api/users/profile"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void getProfile_Authenticated_ReturnsCurrentUserProfileWithDefaultNullPhoto() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String email = "profile." + suffix + "@example.com";
        User user = userService.registerUser(new RegisterUserRequest(email, PASSWORD, "Profile User", "9876543210"));

        MockHttpSession session = login(email);

        mockMvc.perform(get("/api/users/profile").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(user.getId()))
                .andExpect(jsonPath("$.email").value(email))
                .andExpect(jsonPath("$.fullName").value("Profile User"))
                .andExpect(jsonPath("$.profilePhotoUrl").isEmpty())
                .andExpect(jsonPath("$.roles[0]").value("ROLE_USER"))
                .andExpect(jsonPath("$.password").doesNotExist())
                .andExpect(jsonPath("$.passwordHash").doesNotExist());
    }

    @Test
    void uploadProfilePhoto_Anonymous_Returns401() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "avatar.jpg",
                "image/jpeg",
                createValidImageBytes("jpg")
        );

        mockMvc.perform(multipart("/api/users/profile/photo")
                        .file(file)
                        .with(csrf()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void uploadProfilePhoto_ValidJpeg_SucceedsAndPersistsStorageKey() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String email = "photo.jpeg." + suffix + "@example.com";
        User user = userService.registerUser(new RegisterUserRequest(email, PASSWORD, "Jpeg User", "9876543210"));
        MockHttpSession session = login(email);

        byte[] jpegBytes = createValidImageBytes("jpg");
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "profile.jpg",
                "image/jpeg",
                jpegBytes
        );

        mockMvc.perform(multipart("/api/users/profile/photo")
                        .file(file)
                        .with(csrf())
                        .session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(user.getId()))
                .andExpect(jsonPath("$.profilePhotoUrl").value("/api/users/" + user.getId() + "/photo"));

        // Verify database persistence
        User updated = userRepository.findById(user.getId()).orElseThrow();
        assertThat(updated.getProfilePhotoStorageKey()).isNotNull();
        assertThat(updated.getProfilePhotoStorageKey()).startsWith("users/" + user.getId() + "/profile/");
        assertThat(updated.getIsCustomPhoto()).isTrue();

        // Verify photo serving endpoint returns the image
        mockMvc.perform(get("/api/users/" + user.getId() + "/photo"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_TYPE, MediaType.IMAGE_JPEG_VALUE))
                .andExpect(header().exists(HttpHeaders.CACHE_CONTROL))
                .andExpect(content().bytes(jpegBytes));
    }

    @Test
    void uploadProfilePhoto_ValidPng_Succeeds() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String email = "photo.png." + suffix + "@example.com";
        User user = userService.registerUser(new RegisterUserRequest(email, PASSWORD, "Png User", "9876543210"));
        MockHttpSession session = login(email);

        byte[] pngBytes = createValidImageBytes("png");
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "avatar.png",
                "image/png",
                pngBytes
        );

        mockMvc.perform(multipart("/api/users/profile/photo")
                        .file(file)
                        .with(csrf())
                        .session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.profilePhotoUrl").value("/api/users/" + user.getId() + "/photo"));

        User updated = userRepository.findById(user.getId()).orElseThrow();
        assertThat(updated.getProfilePhotoStorageKey()).isNotNull();
        assertThat(updated.getIsCustomPhoto()).isTrue();

        mockMvc.perform(get("/api/users/" + user.getId() + "/photo"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_TYPE, MediaType.IMAGE_PNG_VALUE));
    }

    @Test
    void uploadProfilePhoto_ValidWebP_Succeeds() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String email = "photo.webp." + suffix + "@example.com";
        User user = userService.registerUser(new RegisterUserRequest(email, PASSWORD, "WebP User", "9876543210"));
        MockHttpSession session = login(email);

        byte[] webpBytes = createValidWebpBytes();
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "avatar.webp",
                "image/webp",
                webpBytes
        );

        mockMvc.perform(multipart("/api/users/profile/photo")
                        .file(file)
                        .with(csrf())
                        .session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.profilePhotoUrl").value("/api/users/" + user.getId() + "/photo"));

        User updated = userRepository.findById(user.getId()).orElseThrow();
        assertThat(updated.getProfilePhotoStorageKey()).isNotNull();
        assertThat(updated.getIsCustomPhoto()).isTrue();
    }

    @Test
    void uploadProfilePhoto_InvalidContent_RejectedAndPreservesExistingPhoto() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String email = "photo.invalid." + suffix + "@example.com";
        User user = userService.registerUser(new RegisterUserRequest(email, PASSWORD, "Invalid Photo User", "9876543210"));
        MockHttpSession session = login(email);

        // 1. Upload valid image first
        byte[] validBytes = createValidImageBytes("png");
        MockMultipartFile validFile = new MockMultipartFile(
                "file",
                "initial.png",
                "image/png",
                validBytes
        );
        mockMvc.perform(multipart("/api/users/profile/photo")
                        .file(validFile)
                        .with(csrf())
                        .session(session))
                .andExpect(status().isOk());

        User afterValid = userRepository.findById(user.getId()).orElseThrow();
        String initialStorageKey = afterValid.getProfilePhotoStorageKey();
        assertThat(initialStorageKey).isNotNull();

        // 2. Upload text disguised as JPEG
        MockMultipartFile fakeFile = new MockMultipartFile(
                "file",
                "fake.jpg",
                "image/jpeg",
                "This is not a real image!".getBytes(StandardCharsets.UTF_8)
        );

        mockMvc.perform(multipart("/api/users/profile/photo")
                        .file(fakeFile)
                        .with(csrf())
                        .session(session))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").exists());

        // 3. Verify existing photo is preserved
        User afterFailed = userRepository.findById(user.getId()).orElseThrow();
        assertThat(afterFailed.getProfilePhotoStorageKey()).isEqualTo(initialStorageKey);
        assertThat(afterFailed.getProfilePhotoUrl()).isEqualTo("/api/users/" + user.getId() + "/photo");
    }

    @Test
    void uploadProfilePhoto_OversizedFile_RejectedAndPreservesExistingPhoto() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String email = "photo.oversize." + suffix + "@example.com";
        User user = userService.registerUser(new RegisterUserRequest(email, PASSWORD, "Oversize User", "9876543210"));
        MockHttpSession session = login(email);

        // Max limit is 5MB. Create 5.5MB dummy array with JPEG magic bytes
        byte[] oversizedBytes = new byte[(int) (LocalFileStorageService.MAX_PHOTO_SIZE_BYTES + 1024)];
        oversizedBytes[0] = (byte) 0xFF;
        oversizedBytes[1] = (byte) 0xD8;
        oversizedBytes[2] = (byte) 0xFF;

        MockMultipartFile oversizedFile = new MockMultipartFile(
                "file",
                "huge.jpg",
                "image/jpeg",
                oversizedBytes
        );

        mockMvc.perform(multipart("/api/users/profile/photo")
                        .file(oversizedFile)
                        .with(csrf())
                        .session(session))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("exceeds maximum limit")));

        User afterFailed = userRepository.findById(user.getId()).orElseThrow();
        assertThat(afterFailed.getProfilePhotoStorageKey()).isNull();
    }

    @Test
    void deleteProfilePhoto_RemovesPhotoAndClearsStorageKey() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String email = "photo.delete." + suffix + "@example.com";
        User user = userService.registerUser(new RegisterUserRequest(email, PASSWORD, "Delete User", "9876543210"));
        MockHttpSession session = login(email);

        // Upload photo
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "avatar.png",
                "image/png",
                createValidImageBytes("png")
        );
        mockMvc.perform(multipart("/api/users/profile/photo")
                        .file(file)
                        .with(csrf())
                        .session(session))
                .andExpect(status().isOk());

        User withPhoto = userRepository.findById(user.getId()).orElseThrow();
        assertThat(withPhoto.getProfilePhotoStorageKey()).isNotNull();

        // Delete photo
        mockMvc.perform(delete("/api/users/profile/photo")
                        .with(csrf())
                        .session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.profilePhotoUrl").isEmpty());

        User afterDelete = userRepository.findById(user.getId()).orElseThrow();
        assertThat(afterDelete.getProfilePhotoStorageKey()).isNull();
        assertThat(afterDelete.getProfilePhotoUrl()).isNull();
        assertThat(afterDelete.getIsCustomPhoto()).isFalse();

        // Calling photo serving endpoint now returns 404
        mockMvc.perform(get("/api/users/" + user.getId() + "/photo"))
                .andExpect(status().isNotFound());
    }

    @Test
    void googleOAuth_InitialRegistration_ImportsGooglePhoto() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String email = "google.initial." + suffix + "@merigarage.com";

        // test_google_token:email:name:pictureUrl
        String token = "test_google_token:" + email + ":Google Initial:mock_photo:avatar.png";
        String googleLoginJson = """
                {"credential": "%s"}
                """.formatted(token);

        mockMvc.perform(post("/api/auth/google")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(googleLoginJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(email))
                .andExpect(jsonPath("$.profilePhotoUrl").value(org.hamcrest.Matchers.startsWith("/api/users/")));

        User user = userRepository.findByEmail(email).orElseThrow();
        assertThat(user.getProfilePhotoStorageKey()).isNotNull();
        assertThat(user.getIsCustomPhoto()).isFalse();
    }

    @Test
    void googleOAuth_WithoutPhoto_KeepsDefaultAvatar() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String email = "google.nophoto." + suffix + "@merigarage.com";

        // test_google_token:email:name: (empty pictureUrl)
        String token = "test_google_token:" + email + ":Google NoPhoto:";
        String googleLoginJson = """
                {"credential": "%s"}
                """.formatted(token);

        mockMvc.perform(post("/api/auth/google")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(googleLoginJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(email))
                .andExpect(jsonPath("$.profilePhotoUrl").isEmpty());

        User user = userRepository.findByEmail(email).orElseThrow();
        assertThat(user.getProfilePhotoStorageKey()).isNull();
        assertThat(user.getProfilePhotoUrl()).isNull();
    }

    @Test
    void googleOAuth_SubsequentLogin_PreservesUserUploadedCustomPhoto() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String email = "google.custom." + suffix + "@merigarage.com";

        // 1. Initial Google OAuth login with photo
        String tokenInitial = "test_google_token:" + email + ":Google User:mock_photo:initial.png";
        mockMvc.perform(post("/api/auth/google")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"credential\": \"" + tokenInitial + "\"}"))
                .andExpect(status().isOk());

        User user = userRepository.findByEmail(email).orElseThrow();
        String initialStorageKey = user.getProfilePhotoStorageKey();
        assertThat(initialStorageKey).isNotNull();

        // 2. User uploads their own custom photo
        MockHttpSession session = loginAfterOAuth(email);
        MockMultipartFile customFile = new MockMultipartFile(
                "file",
                "custom.jpg",
                "image/jpeg",
                createValidImageBytes("jpg")
        );
        mockMvc.perform(multipart("/api/users/profile/photo")
                        .file(customFile)
                        .with(csrf())
                        .session(session))
                .andExpect(status().isOk());

        User userAfterCustom = userRepository.findByEmail(email).orElseThrow();
        String customStorageKey = userAfterCustom.getProfilePhotoStorageKey();
        assertThat(customStorageKey).isNotEqualTo(initialStorageKey);
        assertThat(userAfterCustom.getIsCustomPhoto()).isTrue();

        // 3. User signs in with Google again with a different Google photo URL
        String tokenSubsequent = "test_google_token:" + email + ":Google User:mock_photo:different.png";
        mockMvc.perform(post("/api/auth/google")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"credential\": \"" + tokenSubsequent + "\"}"))
                .andExpect(status().isOk());

        // 4. Verify custom photo is STRICTLY preserved and NOT overwritten!
        User userFinal = userRepository.findByEmail(email).orElseThrow();
        assertThat(userFinal.getProfilePhotoStorageKey()).isEqualTo(customStorageKey);
        assertThat(userFinal.getIsCustomPhoto()).isTrue();
    }

    @Test
    void updateProfile_DoesNotRequirePhotoUrlField() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String email = "profile.update." + suffix + "@example.com";
        User user = userService.registerUser(new RegisterUserRequest(email, PASSWORD, "Original Name", "9876543210"));
        MockHttpSession session = login(email);

        // Update profile with only fullName and phoneNumber, without providing photo URL
        String updateJson = """
                {
                    "fullName": "Updated Name",
                    "phoneNumber": "9123456789"
                }
                """;

        mockMvc.perform(put("/api/users/profile")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updateJson)
                        .session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fullName").value("Updated Name"))
                .andExpect(jsonPath("$.phoneNumber").value("+919123456789"));
    }

    private MockHttpSession loginAfterOAuth(String email) throws Exception {
        // Authenticate via test Google token to obtain authenticated session
        String token = "test_google_token:" + email + ":User:";
        MvcResult result = mockMvc.perform(post("/api/auth/google")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"credential\": \"" + token + "\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return (MockHttpSession) result.getRequest().getSession(false);
    }
}
