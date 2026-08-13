package com.mimamori.api.notification;

import static org.assertj.core.api.Assertions.assertThat;

import com.mimamori.api.user.User;
import com.mimamori.api.user.UserRepository;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

/** payload（JSONB）が保存して読み戻せるかの確認。 */
@SpringBootTest
@Transactional
class JsonbRoundTripTest {

    @Autowired private UserRepository users;
    @Autowired private NotificationRepository notifications;

    @Test
    void payloadRoundTrip() {
        User user = users.save(new User("jsonb-test@example.com", "x", "テスト"));

        Notification saved =
                notifications.save(
                        new Notification(
                                user,
                                NotificationType.ARRIVE,
                                Map.of("memberName", "りく", "placeName", "学校")));

        notifications.flush();

        Notification found = notifications.findById(saved.getId()).orElseThrow();
        assertThat(found.getPayload()).containsEntry("memberName", "りく");
        assertThat(found.getPayload()).containsEntry("placeName", "学校");
        assertThat(found.getType()).isEqualTo(NotificationType.ARRIVE);
    }
}
