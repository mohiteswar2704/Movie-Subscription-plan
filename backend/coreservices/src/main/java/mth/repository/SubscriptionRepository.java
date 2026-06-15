package mth.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import mth.models.Subscrip

public interface SubscriptionRepository extends JpaRepository<Subscription, Long> {

	List<Subscription> findByUserIdOrderByUpdatedAtDesc(Long userId);

	Optional<Subscription> findTopByUserIdAndStatusIgnoreCaseOrderByUpdatedAtDesc(Long userId, String status);

	Optional<Subscription> findTopByUserIdOrderByUpdatedAtDesc(Long userId);
}
